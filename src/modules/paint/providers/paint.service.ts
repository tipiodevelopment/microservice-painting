import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { ApiResponse } from '../../../utils/interfaces';

@Injectable()
export class PaintService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async healthCheck() {
    return { executed: true, message: 'OK', microservice: 'Painting' };
  }

  private collectionPath(brandId: string) {
    return `brands/${brandId}/paints`;
  }

  async getAllPaints(
    filters: { name?: string; code?: string; hex?: string },
    limit: number,
    page: number = 1,
  ) {
    console.log('getAllPaints filters', filters);
    const firestore = this.firebaseService.returnFirestore();
    let query = firestore.collectionGroup('paints').orderBy('name');

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
      brandId: doc.ref.parent.parent?.id,
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

  async createPaint(data: {
    brandId: string;
    b: number;
    code: string;
    color: string;
    g: number;
    hex: string;
    name: string;
    r: number;
    set: string;
  }): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      const firestore = this.firebaseService.returnFirestore();
      const paintRef = firestore.collection(`brands/${data.brandId}/paints`);
      const currentDate = new Date();
      const newPaint = {
        created_at: currentDate,
        updated_at: currentDate,
        b: data.b,
        code: data.code,
        color: data.color,
        g: data.g,
        hex: data.hex,
        name: data.name,
        r: data.r,
        set: data.set,
        name_lower: data.name.toLowerCase(),
      };

      const docRef = await paintRef.add(newPaint);
      response.data = { id: docRef.id, ...newPaint, brandId: data.brandId };
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async deletePaint(brandId: string, paintId: string): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      const firestore = this.firebaseService.returnFirestore();
      const paintRef = firestore.doc(`brands/${brandId}/paints/${paintId}`);

      await paintRef.delete();

      response.message = `Paint ${paintId} deleted successfully.`;
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async updatePaint(
    brandId: string,
    paintId: string,
    data: Partial<{
      b: number;
      code: string;
      color: string;
      g: number;
      hex: string;
      name: string;
      r: number;
      set: string;
    }>,
  ): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };
    try {
      const firestore = this.firebaseService.returnFirestore();
      const paintRef = firestore.doc(`brands/${brandId}/paints/${paintId}`);
      const paintSnapshot = await paintRef.get();
      if (!paintSnapshot.exists)
        throw new Error(`Paint ${paintId} not found in brand ${brandId}.`);
      await paintRef.update(data);
      response.message = `Paint ${paintId} updated in brand ${brandId}.`;
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }
}
