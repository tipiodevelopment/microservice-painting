import { Injectable } from '@nestjs/common';
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
    const firestore = this.firebaseService.returnFirestore();
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
  }

  async getUserWhiteList(userId: string) {
    const firestore = this.firebaseService.returnFirestore();

    const querySnap = await firestore
      .collection(documents.wishlist)
      .where('user_id', '==', userId)
      .where('deleted', '==', false)
      .orderBy('priority', 'desc')
      .get();

    const results = [];

    for (const doc of querySnap.docs) {
      const data = doc.data();

      const paintSnap = await firestore
        .doc(`brands/${data.brand_id}/paints/${data.paint_id}`)
        .get();

      const brandSnap = await firestore.doc(`brands/${data.brand_id}`).get();

      // 🔍 Buscar las paletas que contienen esta pintura con esta marca
      const palettesPaintsSnap = await firestore
        .collection('palettes_paints')
        .where('paint_id', '==', data.paint_id)
        .where('brand_id', '==', data.brand_id)
        .get();

      const paletteNames: string[] = [];

      for (const ref of palettesPaintsSnap.docs) {
        const paletteData = ref.data();
        const paletteSnap = await firestore
          .doc(`palettes/${paletteData.palette_id}`)
          .get();

        if (
          paletteSnap.exists &&
          paletteSnap.data()?.userId === userId // ✅ solo paletas del usuario
        ) {
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
        paint: paintSnap.exists ? paintSnap.data() : null,
        brand: brandSnap.exists ? brandSnap.data() : null,
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

    await ref.update({ ...updates, updated_at: new Date() });
    return { updated: true };
  }
}
