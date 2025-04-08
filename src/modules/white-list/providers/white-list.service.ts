import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { documents } from 'src/utils/enums/documents.enum';

@Injectable()
export class WhiteListService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async healthCheck() {
    return { executed: true, message: 'OK', microservice: 'Painting' };
  }

  async seedWhitelist(userId: string) {
    const firestore = this.firebaseService.returnFirestore();
    const now = new Date();

    const paints = [
      {
        brand_id: 'AK',
        paint_id: 'AK004',
        type: 'favorite',
        priority: 1,
        deleted: false,
      },
      {
        brand_id: 'AK',
        paint_id: 'AK005',
        type: 'wishlist',
        priority: 2,
        deleted: false,
      },
      {
        brand_id: 'AppleBarrel',
        paint_id: '20210',
        type: 'favorite',
        priority: null,
        deleted: false,
      },
      {
        brand_id: 'AppleBarrel',
        paint_id: '20211',
        type: 'wishlist',
        priority: null,
        deleted: false,
      },
      {
        brand_id: 'Arteza',
        paint_id: 'A001',
        type: 'favorite',
        priority: null,
        deleted: false,
      },
      {
        brand_id: 'Arteza',
        paint_id: 'A002',
        type: 'wishlist',
        priority: null,
        deleted: false,
      },
    ];

    const inserted = [];

    for (const paint of paints) {
      const ref = firestore.collection(documents.wishlist).doc();

      await ref.set({
        user_id: userId,
        paint_id: paint.paint_id,
        brand_id: paint.brand_id,
        type: paint.type,
        priority: paint.priority,
        created_at: now,
        updated_at: now,
      });

      inserted.push({ id: ref.id, ...paint });
    }

    return { inserted: inserted.length, user_id: userId, items: inserted };
  }

  async saveToWhiteList(
    userId: string,
    body: {
      paint_id: string;
      brand_id: string;
      type: string;
      priority: number;
    },
  ) {
    try {
      const firestore = this.firebaseService.returnFirestore();

      // Validate that the user exists
      const userDoc = await firestore
        .collection(documents.users)
        .doc(userId)
        .get();
      if (!userDoc.exists) {
        throw new NotFoundException('User does not exist');
      }

      // Validate that the brand exists
      const brandDoc = await firestore
        .collection(documents.brands)
        .doc(body.brand_id)
        .get();
      if (!brandDoc.exists) {
        throw new NotFoundException('Brand does not exist');
      }

      // Validate that the paint exists within the brand
      const paintDoc = await firestore
        .collection(documents.brands)
        .doc(body.brand_id)
        .collection(documents.paints)
        .doc(body.paint_id)
        .get();
      if (!paintDoc.exists) {
        throw new NotFoundException(
          'Paint does not exist for the specified brand',
        );
      }

      // Check if a wishlist entry already exists for the given combination (active or deleted)
      const existingSnapshot = await firestore
        .collection(documents.wishlist)
        .where('user_id', '==', userId)
        .where('paint_id', '==', body.paint_id)
        .where('brand_id', '==', body.brand_id)
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        const existingDoc = existingSnapshot.docs[0];
        const existingData = existingDoc.data();

        // If the entry is active, throw a conflict exception
        if (existingData.deleted === false) {
          throw new ConflictException('Paint is already in the wishlist');
        } else {
          // If the entry exists but is marked as deleted, reactivate it by updating the entry
          await existingDoc.ref.update({
            type: body.type,
            priority: body.priority,
            updated_at: new Date(),
            deleted: false,
          });
          return { success: true, id: existingDoc.id, restored: true };
        }
      }

      // If no entry exists, create a new one
      const ref = firestore.collection(documents.wishlist).doc();
      await ref.set({
        user_id: userId,
        paint_id: body.paint_id,
        brand_id: body.brand_id,
        type: body.type,
        priority: body.priority,
        created_at: new Date(),
        updated_at: new Date(),
        deleted: false,
      });

      return { success: true, id: ref.id };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error processing request: ${error.message}`,
      );
    }
  }

  async getUserWhiteList(userId: string) {
    const firestore = this.firebaseService.returnFirestore();

    // Validate that the user exists
    const userDoc = await firestore
      .collection(documents.users)
      .doc(userId)
      .get();
    if (!userDoc.exists) {
      throw new NotFoundException('User does not exist');
    }

    const querySnap = await firestore
      .collection(documents.wishlist)
      .where('user_id', '==', userId)
      .where('deleted', '==', false)
      .orderBy('priority', 'desc')
      .get();

    const results = [];

    for (const doc of querySnap.docs) {
      const data = doc.data();

      // Validate that both the paint and the brand exist
      const paintSnap = await firestore
        .doc(`brands/${data.brand_id}/${documents.paints}/${data.paint_id}`)
        .get();
      const brandSnap = await firestore
        .doc(`${documents.brands}/${data.brand_id}`)
        .get();

      // Exclude legacy records if brand or paint do not exist
      if (!paintSnap.exists || !brandSnap.exists) {
        continue;
      }

      // Look for palettes that contain this paint with this brand
      const palettesPaintsSnap = await firestore
        .collection('palettes_paints')
        .where('paint_id', '==', data.paint_id)
        .where('brand_id', '==', data.brand_id)
        .get();

      const paletteNames: string[] = [];
      for (const ref of palettesPaintsSnap.docs) {
        const paletteData = ref.data();
        const paletteSnap = await firestore
          .doc(`${documents.palettes}/${paletteData.palette_id}`)
          .get();
        if (paletteSnap.exists && paletteSnap.data()?.userId === userId) {
          paletteNames.push(paletteSnap.data().name);
        }
      }

      results.push({
        id: doc.id,
        paint_id: data.paint_id,
        brand_id: data.brand_id,
        type: data.type,
        priority: data.priority,
        created_at: data.created_at,
        paint: paintSnap.data(),
        brand: brandSnap.data(),
        palettes: paletteNames,
      });
    }

    return { userId, whitelist: results };
  }

  async deleteItem(id: string, userId: string) {
    const firestore = this.firebaseService.returnFirestore();
    const ref = firestore.collection(documents.wishlist).doc(id);
    const snap = await ref.get();

    if (!snap.exists || snap.data().user_id !== userId) {
      throw new Error('Not found or unauthorized');
    }

    await ref.update({
      deleted: true,
      updated_at: new Date(),
    });

    return { deleted: true, soft: true };
  }

  async updateItem(
    id: string,
    userId: string,
    updates: { type?: string; priority?: number },
  ) {
    const firestore = this.firebaseService.returnFirestore();
    const ref = firestore.collection(documents.wishlist).doc(id);
    const snap = await ref.get();

    if (!snap.exists || snap.data().user_id !== userId) {
      throw new Error('Not found or unauthorized');
    }

    // Obtener todos los ítems con prioridad
    const priorityQuery = await firestore
      .collection(documents.wishlist)
      .where('user_id', '==', userId)
      .where('priority', '!=', null)
      .orderBy('priority')
      .get();

    let priorityItems = priorityQuery.docs.map((doc) => ({
      id: doc.id,
      priority: doc.data().priority,
    }));

    // Remover el ítem actual de la lista
    priorityItems = priorityItems.filter((item) => item.id !== id);

    if (updates.priority === -1) {
      // Quitar prioridad
      await ref.update({ priority: null, updated_at: new Date() });

      // Reasignar prioridades (comprimir)
      await Promise.all(
        priorityItems.map((item, index) => {
          return firestore
            .collection(documents.wishlist)
            .doc(item.id)
            .update({
              priority: index + 1,
              updated_at: new Date(),
            });
        }),
      );

      return { updated: true, newPriority: null };
    }

    if (updates.priority === 0) {
      // Agregar al final
      const newPriority = priorityItems.length + 1;
      priorityItems.push({ id, priority: newPriority });

      await ref.update({ priority: newPriority, updated_at: new Date() });
      return { updated: true, newPriority };
    }

    // Insertar en posición específica
    const insertAt = updates.priority!;
    priorityItems.splice(insertAt - 1, 0, { id, priority: insertAt });

    // Reasignar todas las prioridades
    await Promise.all(
      priorityItems.map((item, index) => {
        return firestore
          .collection(documents.wishlist)
          .doc(item.id)
          .update({
            priority: index + 1,
            updated_at: new Date(),
          });
      }),
    );

    return { updated: true, newPriority: insertAt };
  }
}
