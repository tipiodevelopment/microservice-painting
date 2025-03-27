import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';

@Injectable()
export class ColorSearchesService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async healthCheck() {
    return { executed: true, message: 'OK', microservice: 'Painting' };
  }

  async saveColorSearch(
    userId: string,
    paints: { paint_id: string; brand_id: string }[],
  ) {
    const firestore = this.firebaseService.returnFirestore();
    const searchRef = firestore.collection('color_searches').doc();

    await searchRef.set({
      user_id: userId,
      paints,
      created_at: new Date(),
    });

    return { success: true, message: 'Color search saved.' };
  }

  async getUserColorSearches(userId: string) {
    const firestore = this.firebaseService.returnFirestore();
    const querySnap = await firestore
      .collection('color_searches')
      .where('user_id', '==', userId)
      .get();

    const results = [];

    for (const doc of querySnap.docs) {
      const data = doc.data();
      for (const paintRef of data.paints) {
        const paintSnap = await firestore
          .doc(`brands/${paintRef.brand_id}/paints/${paintRef.paint_id}`)
          .get();

        const brandSnap = await firestore
          .doc(`brands/${paintRef.brand_id}`)
          .get();

        results.push({
          paint_id: paintRef.paint_id,
          brand_id: paintRef.brand_id,
          paint: paintSnap.exists ? paintSnap.data() : null,
          brand: brandSnap.exists ? brandSnap.data() : null,
        });
      }
    }

    return { userId, paints: results };
  }
}
