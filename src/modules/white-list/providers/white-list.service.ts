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

      if (body.priority < 0 || body.priority > 5) {
        throw new Error('Priority must be between 0 and 5');
      }

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

      // <-- NUEVO BLOQUE: Verificar si existe en INVENTORY y eliminarlo si es así -->
      const inventorySnapshot = await firestore
        .collection(documents.inventory)
        .where('user_id', '==', userId)
        .where('brand_id', '==', body.brand_id)
        .where('paint_id', '==', body.paint_id)
        .limit(1)
        .get();
      if (!inventorySnapshot.empty) {
        // Se elimina el registro del inventario
        for (const doc of inventorySnapshot.docs) {
          await doc.ref.delete();
        }
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

      // Create new wishlist entry
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

      try {
        const usersSnapshot = await this.firebaseService.getCollection(
          documents.users,
        );
        const tokens: string[] = [];
        usersSnapshot.data?.forEach((user) => {
          if (user.fcm_token) {
            tokens.push(user.fcm_token);
          }
        });
        await this.firebaseService.sendMulticastNotification(tokens, {
          title: '🎨 New Paint Added',
          body: 'Check out the latest color combinations!',
        });
      } catch {}

      return { success: true, id: ref.id };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error processing request: ${error.message}`,
      );
    }
  }

  async getUserWhiteList(userId: string) {
    const firestore = this.firebaseService.returnFirestore();

    // Validar que el usuario existe
    const userDoc = await firestore
      .collection(documents.users)
      .doc(userId)
      .get();
    if (!userDoc.exists) {
      throw new NotFoundException('User does not exist');
    }

    // Consulta ordenada por priority DESC y updated_at DESC
    const querySnap = await firestore
      .collection(documents.wishlist)
      .where('user_id', '==', userId)
      .where('deleted', '==', false)
      .orderBy('priority', 'desc')
      .orderBy('updated_at', 'desc')
      .get();

    const results = [];

    for (const doc of querySnap.docs) {
      const data = doc.data();

      const paintSnap = await firestore
        .doc(`brands/${data.brand_id}/${documents.paints}/${data.paint_id}`)
        .get();
      const brandSnap = await firestore
        .doc(`${documents.brands}/${data.brand_id}`)
        .get();

      if (!paintSnap.exists || !brandSnap.exists) {
        continue;
      }

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
        priority: data.priority ?? 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
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

    if (updates.priority < 0 || updates.priority > 5) {
      throw new Error('Priority must be between 0 and 5');
    }

    await ref.update({
      ...updates,
      updated_at: new Date(),
    });

    return { updated: true, newPriority: updates.priority ?? null };
  }

  async getUserWhiteListByFilters(
    userId: string,
    filters?: {
      q?: string;
      priority?: number;
      brand_id?: string;
      palette?: string;
      sortBy?: 'created_at' | 'alphabetical';
      direction?: 'asc' | 'desc';
      limit?: number;
      page?: number;
    },
  ): Promise<any> {
    const firestore = this.firebaseService.returnFirestore();

    // Validar que el usuario existe
    const userDoc = await firestore
      .collection(documents.users)
      .doc(userId)
      .get();
    if (!userDoc.exists) {
      throw new NotFoundException('User does not exist');
    }

    // Consulta base con orden por priority y updated_at
    const querySnap = await firestore
      .collection(documents.wishlist)
      .where('user_id', '==', userId)
      .where('deleted', '==', false)
      .orderBy('priority', 'desc')
      .orderBy('updated_at', 'desc') // aseguramos orden por fecha secundaria
      .get();

    let results = [];
    for (const doc of querySnap.docs) {
      const data = doc.data();
      const paintSnap = await firestore
        .doc(`brands/${data.brand_id}/${documents.paints}/${data.paint_id}`)
        .get();
      const brandSnap = await firestore
        .doc(`${documents.brands}/${data.brand_id}`)
        .get();

      if (!paintSnap.exists || !brandSnap.exists) continue;

      const palettesPaintsSnap = await firestore
        .collection('palettes_paints')
        .where('paint_id', '==', data.paint_id)
        .where('brand_id', '==', data.brand_id)
        .get();

      const paletteNames: string[] = [];
      for (const ppDoc of palettesPaintsSnap.docs) {
        const paletteData = ppDoc.data();
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
        priority: data.priority ?? 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
        paint: paintSnap.data(),
        brand: brandSnap.data(),
        palettes: paletteNames,
      });
    }

    // Aplicar filtros en memoria
    if (filters) {
      if (filters.priority !== undefined) {
        results = results.filter((item) => item.priority === filters.priority);
      }
      if (filters.brand_id) {
        results = results.filter((item) => item.brand_id === filters.brand_id);
      }
      if (filters.q) {
        const queryText = filters.q.toLowerCase();
        results = results.filter((item) => {
          const paintingName = item.paint?.name?.toLowerCase() || '';
          const brandName = item.brand?.name?.toLowerCase() || '';
          return (
            paintingName.includes(queryText) || brandName.includes(queryText)
          );
        });
      }
      if (filters.palette) {
        const paletteQuery = filters.palette.toLowerCase();
        results = results.filter(
          (item) =>
            item.palettes &&
            item.palettes.some((p: string) =>
              p.toLowerCase().includes(paletteQuery),
            ),
        );
      }

      // Ordenamiento adicional solo si se especifica sortBy
      if (filters.sortBy) {
        if (filters.sortBy === 'created_at') {
          results = results.sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return filters.direction === 'asc'
              ? dateA.getTime() - dateB.getTime()
              : dateB.getTime() - dateA.getTime();
          });
        } else if (filters.sortBy === 'alphabetical') {
          results = results.sort((a, b) => {
            const nameA = a.paint?.name?.toLowerCase() || '';
            const nameB = b.paint?.name?.toLowerCase() || '';
            if (nameA < nameB) return filters.direction === 'asc' ? -1 : 1;
            if (nameA > nameB) return filters.direction === 'asc' ? 1 : -1;
            return 0;
          });
        }
      }
    }

    const totalItems = results.length;

    // Paginación
    if (filters?.limit && filters?.page) {
      const limit = filters.limit;
      const page = filters.page;
      const startIndex = (page - 1) * limit;
      results = results.slice(startIndex, startIndex + limit);
      return {
        userId,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        whitelist: results,
      };
    }

    return { userId, totalItems, whitelist: results };
  }
}
