import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { ApiResponse } from '../../../utils/interfaces';
import { documents } from '../../../utils/enums/documents.enum';

@Injectable()
export class PaintService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async healthCheck() {
    return { executed: true, message: 'OK', microservice: 'Painting' };
  }

  async countPaintsWithAndWithoutBarcode() {
    const firestore = this.firebaseService.returnFirestore();
    const snapshot = await firestore.collectionGroup('paints').get();

    let withBarcode = 0;
    let withoutBarcode = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const barcode = data.barcode;

      if (barcode && typeof barcode === 'string' && barcode.trim() !== '') {
        withBarcode++;
      } else {
        withoutBarcode++;
      }
    });

    return {
      total: snapshot.size,
      withBarcode,
      withoutBarcode,
    };
  }

  async getPaintsWithoutBarcode(): Promise<
    { id: string; brandId: string; name: string }[]
  > {
    const firestore = this.firebaseService.returnFirestore();
    const snapshot = await firestore.collectionGroup('paints').get();

    const paintsWithoutBarcode: {
      id: string;
      brandId: string;
      name: string;
    }[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const barcode = data.barcode;

      if (!barcode || typeof barcode !== 'string' || barcode.trim() === '') {
        const brandId = doc.ref.parent.parent?.id || '';
        paintsWithoutBarcode.push({
          id: doc.id,
          brandId,
          name: data.name || '',
          // ...data,
        });
      }
    });

    return paintsWithoutBarcode;
  }

  private collectionPath(brandId: string) {
    return `brands/${brandId}/paints`;
  }

  async getAllPaints(
    filters: { name?: string; code?: string; hex?: string; brandId?: string },
    limit: number,
    page: number = 1,
    sort: 'asc' | 'desc' = 'asc',
  ) {
    const responseBrands = await this.firebaseService.getCollection(
      documents.brands,
    );
    const brands = responseBrands.data;
    console.log('getAllPaints filters', filters);
    const firestore = this.firebaseService.returnFirestore();
    let query;
    if (filters?.brandId)
      query = firestore
        .collection(this.collectionPath(filters.brandId))
        .orderBy('name', sort);
    else query = firestore.collectionGroup('paints').orderBy('name', sort);

    if (filters.name) {
      const nameFilter = filters.name.toLowerCase();
      query = query
        .where('name_lower', '>=', nameFilter)
        .where('name_lower', '<=', nameFilter + '\uf8ff');
    } else {
      query = query.where('name_lower', '>', '').orderBy('name_lower');
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

    const startIndex = (currentPage - 1) * limit;
    let startAfterDoc = null;

    if (startIndex > 0) {
      startAfterDoc = totalSnapshot.docs[startIndex - 1];
    }

    if (startAfterDoc) {
      query = query.startAfter(startAfterDoc);
    }

    const snapshot = await query.limit(limit).get();
    const paints = snapshot.docs.map((doc) => {
      const brandId = doc.ref.parent.parent?.id;
      const _paint = doc.data();
      const brand = brands.find((b) => b.id == brandId)?.name;
      return {
        id: doc.id,
        brand,
        brandId,
        ..._paint,
        created_at: new Date(_paint?.created_at._seconds * 1000),
        updated_at: new Date(_paint?.updated_at._seconds * 1000),
        category: !_paint?.category ? '' : _paint.category,
        isMetallic: !_paint?.isMetallic ? false : _paint.isMetallic,
        isTransparent: !_paint?.isTransparent ? false : _paint.isTransparent,
      };
    });

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
      brandId: doc.ref?.parent?.parent?.id,
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
      name_lower: string;
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

      if (data?.name) data.name_lower = data.name.toLocaleLowerCase();
      await paintRef.update(data);
      response.message = `Paint ${paintId} updated in brand ${brandId}.`;
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async findClosestPaintsAcrossBrands(
    brandIds: string[],
    hex: string,
    limit = 10,
    page = 1,
  ) {
    const firestore = this.firebaseService.returnFirestore();
    const targetRGB = this.hexToRgb(hex);
    if (!targetRGB) throw new Error('Invalid hex color');

    const maxDistance = Math.sqrt(255 ** 2 + 255 ** 2 + 255 ** 2);
    const allPaints: any[] = [];

    // Leer marcas en paralelo
    const brandPromises = brandIds.map(async (brandId) => {
      const brandSnap = await firestore.collection('brands').doc(brandId).get();
      if (!brandSnap.exists) return null;

      const brandData = brandSnap.data();

      const paintsSnap = await firestore
        .collection(`brands/${brandId}/paints`)
        .get();

      if (paintsSnap.empty) return null;

      return paintsSnap.docs.map((doc) => {
        const paint = doc.data();
        const distance = this.calculateEuclideanDistance(targetRGB, {
          r: paint.r,
          g: paint.g,
          b: paint.b,
        });
        const similarity = +(100 - (distance / maxDistance) * 100).toFixed(2);

        return {
          id: doc.id,
          similarity,
          ...paint,
          brand: {
            id: brandId,
            name: brandData.name,
            logo_url: brandData.logo_url,
          },
        };
      });
    });

    // Esperar todas las marcas y pintar
    const results = await Promise.all(brandPromises);

    // Aplanar y filtrar nulos
    results
      .filter(Boolean)
      .forEach((paintArray) => allPaints.push(...paintArray));

    // Ordenar por similitud global
    allPaints.sort((a, b) => b.similarity - a.similarity);

    // Paginar
    const totalPaints = allPaints.length;
    const totalPages = Math.ceil(totalPaints / limit);
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * limit;
    const paginatedPaints = allPaints.slice(startIndex, startIndex + limit);

    return {
      currentPage,
      totalPages,
      totalPaints,
      limit,
      paints: paginatedPaints,
    };
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const cleanHex = hex.replace('#', '').trim();
    if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) return null;

    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    return { r, g, b };
  }

  private calculateEuclideanDistance(
    c1: { r: number; g: number; b: number },
    c2: { r: number; g: number; b: number },
  ): number {
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2),
    );
  }
}
