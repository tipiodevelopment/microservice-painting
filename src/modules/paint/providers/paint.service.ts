import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';

@Injectable()
export class PaintService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async healthCheck() {
    return { executed: true, message: 'OK', microservice: 'Painting' };
  }

  private collectionPath(brandId: string) {
    return `brands/${brandId}/paints`;
  }

  async getPaints(
    brandId: string,
    filters: { name?: string; code?: string; hex?: string },
    limit: number,
    page: number = 1,
  ) {
    console.log(`getPaints brandId`, brandId, 'filters', filters);
    const firestore = this.firebaseService.returnFirestore();
    let query = firestore
      .collection(this.collectionPath(brandId))
      .orderBy('name');

    if (filters.name) {
      const nameFilter = filters.name.toLowerCase();
      query = query
        .where('name_lower', '>=', nameFilter)
        .where('name_lower', '<=', nameFilter + '\uf8ff');
    }
    if (filters.code) {
      query = query.where('code', '==', filters.code);
    }
    if (filters.hex) {
      query = query.where('hex', '==', filters.hex);
    }

    const totalSnapshot = await query.get();
    const totalPaints = totalSnapshot.size;
    const totalPages = Math.ceil(totalPaints / limit);

    const currentPage = Math.min(Math.max(page, 1), totalPages);

    // Calcular el índice del primer documento de la página
    const startIndex = (currentPage - 1) * limit;
    let startAfterDoc = null;

    if (startIndex > 0) {
      startAfterDoc = totalSnapshot.docs[startIndex - 1]; // Documento para hacer `startAfter`
    }

    if (startAfterDoc) {
      query = query.startAfter(startAfterDoc);
    }

    const snapshot = await query.limit(limit).get();
    const paints = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      currentPage,
      totalPaints,
      totalPages,
      limit,
      paints,
    };
  }

  async updateNameLowerForAllPaints(): Promise<any> {
    const firestore = this.firebaseService.returnFirestore();
    const brandsRef = firestore.collection('brands');
    const brandsSnapshot = await brandsRef.get();
    if (brandsSnapshot.empty) {
      console.log('Not found Brands.');
      return;
    }

    for (const brandDoc of brandsSnapshot.docs) {
      const brandId = brandDoc.id;
      const paintsRef = firestore
        .collection('brands')
        .doc(brandId)
        .collection('paints');
      const paintsSnapshot = await paintsRef.get();
      if (paintsSnapshot.empty) {
        console.log(`Not found pints to brand ${brandId}.`);
        continue;
      }

      const updates = paintsSnapshot.docs.map((paintDoc) => {
        const paintData = paintDoc.data();
        if (paintData.name) {
          const nameLower = paintData.name.toLowerCase();

          return firestore
            .collection('brands')
            .doc(brandId)
            .collection('paints')
            .doc(paintDoc.id)
            .update({
              name_lower: nameLower,
            });
        }
      });
      await Promise.all(updates);
      console.log(`Updated paints to brand ${brandId}.`);
    }

    return { message: 'Update Completed.' };
  }
}
