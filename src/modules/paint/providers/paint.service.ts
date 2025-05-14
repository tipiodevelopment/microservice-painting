import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { ApiResponse } from '../../../utils/interfaces';
import { documents } from '../../../utils/enums/documents.enum';
import { PendingPaintSubmissionDto } from '../dto/PendingPaintSubmission.dto';

@Injectable()
export class PaintService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async healthCheck() {
    return {
      executed: true,
      message: 'OK',
      microservice: 'Painting',
    };
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
    filters: {
      name?: string;
      code?: string;
      hex?: string;
      brandId?: string;
      category?: string;
    },
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
        .orderBy('name', sort || 'asc');
    else
      query = firestore
        .collectionGroup('paints')
        .orderBy('name', sort || 'asc');

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
    if (filters?.category) {
      query = query.where('category', '==', filters.category);
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
      const brand = brands.find((b) => b.id == brandId);

      const name = brand.name;
      const logo_url = brand.logo_url;

      return {
        id: doc.id,
        brand: name,
        brandLogo: logo_url,
        brandId,
        ..._paint,
        created_at: new Date(_paint?.created_at?._seconds * 1000),
        updated_at: new Date(_paint?.updated_at?._seconds * 1000),
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
    barcode?: string;
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
        barcode: data.barcode ?? '',
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
      barcode: string;
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

  async getPaintUsageInfo(
    userId: string,
    brandId: string,
    paintId: string,
  ): Promise<ApiResponse> {
    const response: ApiResponse = { executed: true, message: '', data: null };
    try {
      const firestore = this.firebaseService.returnFirestore();

      // 1. Obtener la información de la pintura.
      const paintDocRef = firestore.doc(
        `${documents.brands}/${brandId}/paints/${paintId}`,
      );
      const paintDoc = await paintDocRef.get();
      if (!paintDoc.exists) {
        throw new Error(
          `Paint with id: ${paintId} was not found for brand ${brandId}`,
        );
      }
      const paintData = paintDoc.data();

      // 2. Obtener la información de la marca.
      const brandDocRef = firestore.doc(`${documents.brands}/${brandId}`);
      const brandDoc = await brandDocRef.get();
      const brandData = brandDoc.exists ? brandDoc.data() : null;

      // 3. Verificar si la pintura está en el inventario del usuario.
      const invQuery = await firestore
        .collection(documents.inventory)
        .where('user_id', '==', userId)
        .where('brand_id', '==', brandId)
        .where('paint_id', '==', paintId)
        .limit(1)
        .get();
      const inInventory = !invQuery.empty;

      // 4. Verificar si la pintura está en la wishlist (registros activos) del usuario.
      const wlQuery = await firestore
        .collection(documents.wishlist)
        .where('user_id', '==', userId)
        .where('brand_id', '==', brandId)
        .where('paint_id', '==', paintId)
        .where('deleted', '==', false)
        .limit(1)
        .get();
      const inWhitelist = !wlQuery.empty;

      // 5. Obtener las paletas en las que se utiliza esta pintura.
      const ppSnapshot = await firestore
        .collection(documents.palettes_paints)
        .where('brand_id', '==', brandId)
        .where('paint_id', '==', paintId)
        .get();
      const palettes: any[] = [];
      for (const ppDoc of ppSnapshot.docs) {
        const ppData = ppDoc.data();
        if (ppData.palette_id) {
          const paletteDoc = await firestore
            .doc(`${documents.palettes}/${ppData.palette_id}`)
            .get();
          if (paletteDoc.exists) {
            const paletteData = paletteDoc.data();
            // Filtrar para mostrar solo las paletas del usuario (si es que aplica)
            if (paletteData.userId === userId) {
              palettes.push({
                created_at: paletteData.created_at, // Puedes formatear la fecha según sea necesario
                name: paletteData.name,
                userId: paletteData.userId,
              });
            }
          }
        }
      }

      // 6. Armar la respuesta final incluyendo la info de la pintura y de la marca.
      response.data = {
        brand_id: brandId,
        paint_id: paintId,
        paint: paintData, // Información completa de la pintura.
        brand: brandData, // Información completa de la marca.
        in_inventory: inInventory,
        in_whitelist: inWhitelist,
        palettes, // Listado de paletas en las que se utiliza la pintura.
        inventory_id: inInventory ? invQuery.docs[0].id : '',
        wishlist_id: inWhitelist ? wlQuery.docs[0].id : '',
      };
    } catch (error) {
      response.executed = false;
      response.message = error.message;
    }
    return response;
  }

  async getByBarcode(userId: string, barcode: string): Promise<ApiResponse> {
    const response: ApiResponse = { executed: true, message: '', data: [] };
    try {
      const firestore = await this.firebaseService.returnFirestore();
      const snapshot = await firestore
        .collectionGroup(documents.paints)
        .where('barcode', '==', barcode)
        .orderBy('name')
        .limit(100)
        .get();

      if (!snapshot.empty) {
        const responseBrands = await this.firebaseService.getCollection(
          documents.brands,
        );
        const brands = responseBrands.data;
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
            isTransparent: !_paint?.isTransparent
              ? false
              : _paint.isTransparent,
          };
        });

        if (userId != '') {
          const getPalettes = async (paint) => {
            const palettes: any[] = [];
            const ppSnapshot = await firestore
              .collection(documents.palettes_paints)
              .where('brand_id', '==', paint.brandId)
              .where('paint_id', '==', paint.id)
              .get();
            for await (const ppDoc of ppSnapshot.docs) {
              const ppData = ppDoc.data();
              if (ppData.palette_id) {
                const paletteDoc = await firestore
                  .doc(`${documents.palettes}/${ppData.palette_id}`)
                  .get();
                if (paletteDoc.exists) {
                  const paletteData = paletteDoc.data();
                  if (paletteData.userId === userId) {
                    palettes.push({
                      created_at: paletteData.created_at,
                      name: paletteData.name,
                      userId: paletteData.userId,
                    });
                  }
                }
              }
            }
            paint.palettes = palettes;
          };
          await Promise.all(paints.map(getPalettes));
        } else {
          paints.forEach((paint: any) => {
            paint.palettes = [];
          });
        }

        response.data = paints;
      }
    } catch (error) {
      response.executed = false;
      response.message = error.message;
    } finally {
      return response;
    }
  }

  async getRepeatedBarcodes(): Promise<ApiResponse> {
    const response: ApiResponse = { executed: true, message: '', data: [] };

    try {
      const firestore = await this.firebaseService.returnFirestore();

      const snapshot = await firestore.collectionGroup(documents.paints).get();

      if (!snapshot.empty) {
        const paintsRaw = snapshot.docs.map((doc) => {
          const brandId = doc.ref.parent.parent?.id;
          const _paint = doc.data();
          return {
            id: doc.id,
            brandId,
            ..._paint,
            created_at: _paint?.created_at?._seconds
              ? new Date(_paint.created_at._seconds * 1000)
              : null,
            updated_at: _paint?.updated_at?._seconds
              ? new Date(_paint.updated_at._seconds * 1000)
              : null,
            category: !_paint?.category ? '' : _paint.category,
            isMetallic: !!_paint?.isMetallic,
            isTransparent: !!_paint?.isTransparent,
          };
        });

        // Agrupar por barcode
        const grouped = paintsRaw.reduce(
          (acc, paint: any) => {
            if (!paint.barcode) return acc;
            if (!acc[paint.barcode]) acc[paint.barcode] = [];
            acc[paint.barcode].push(paint);
            return acc;
          },
          {} as Record<string, any[]>,
        );

        // Filtrar barcodes duplicados
        const duplicatedPaints = Object.values(grouped)
          .filter((group) => group.length > 1)
          .flat();

        // Obtener brands
        const responseBrands = await this.firebaseService.getCollection(
          documents.brands,
        );
        const brands = responseBrands.data;

        // Añadir nombre del brand
        response.data = duplicatedPaints.map((paint) => {
          const brand = brands.find((b) => b.id === paint.brandId)?.name ?? '';
          return {
            ...paint,
            brand,
            palettes: [], // no se incluyen palettes aquí
          };
        });
      }
    } catch (error) {
      response.executed = false;
      response.message = error.message;
    } finally {
      return response;
    }
  }

  async getPaintStatus(
    userId: string,
    brandIdentifier: string,
    paintId: string,
  ): Promise<ApiResponse> {
    const response: ApiResponse = { executed: true, message: '', data: null };
    try {
      const firestore = this.firebaseService.returnFirestore();

      // Intentar obtener el documento de la marca usando el identificador como ID.
      const brandDoc = await firestore
        .collection(documents.brands)
        .doc(brandIdentifier)
        .get();
      let realBrandId: string;
      let brandData: any;
      if (brandDoc.exists) {
        brandData = brandDoc.data();
        realBrandId = brandIdentifier;
      } else {
        // Si no se encontró, buscar un documento cuyo campo "name" coincida con el valor recibido.
        const querySnap = await firestore
          .collection(documents.brands)
          .where('name', '==', brandIdentifier)
          .limit(1)
          .get();
        if (querySnap.empty) {
          throw new NotFoundException('Brand not found');
        }
        realBrandId = querySnap.docs[0].id;
        brandData = querySnap.docs[0].data();
      }

      // Consultar en la colección de inventory.
      const invQuery = await firestore
        .collection(documents.inventory)
        .where('user_id', '==', userId)
        .where('brand_id', '==', realBrandId)
        .where('paint_id', '==', paintId)
        .limit(1)
        .get();
      const is_inventory = !invQuery.empty;

      // Consultar en la colección de wishlist (solo activos: deleted == false).
      const wlQuery = await firestore
        .collection(documents.wishlist)
        .where('user_id', '==', userId)
        .where('brand_id', '==', realBrandId)
        .where('paint_id', '==', paintId)
        .where('deleted', '==', false)
        .limit(1)
        .get();
      const is_wishlist = !wlQuery.empty;

      response.data = {
        paint_id: paintId,
        brand_id: realBrandId,
        brand_name: brandData?.name || null,
        is_inventory,
        is_wishlist,
        inventory_id: is_inventory ? invQuery.docs[0].id : '',
        wishlist_id: is_wishlist ? wlQuery.docs[0].id : '',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error obtaining paint status: ${error.message}`,
      );
    }
    return response;
  }

  async getCategories(): Promise<ApiResponse> {
    const response: ApiResponse = { executed: true, message: '', data: [] };
    try {
      const categoryResponse = await this.firebaseService.getCollection(
        documents.category,
      );
      const categories = categoryResponse.data;
      response.data = categories.map((c) => {
        return {
          ...c,
          created_at: new Date(c?.created_at._seconds * 1000),
          updated_at: new Date(c?.updated_at._seconds * 1000),
        };
      });
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async processCategoryPaints() {
    console.log(`processCategoryPaints`);
    const mapCategorys = [
      'Effects',
      'Effect',
      'Acrylics',
      'Acrylic',
      'Base',
      'Contrast',
      'Layer',
      'Shade',
      'Dry',
      'Technical',
      'Air',
      'Spray',
      'Sprays',
      'Metallics',
      'Metallic',
      'Metal',
      'Transparent',
    ];
    console.log(`------------------------`);
    console.log(`Getting Paints...`);
    const firestore = this.firebaseService.returnFirestore();
    const snapshot = await firestore.collectionGroup(documents.paints).get();
    console.log(`Paints on memory Ok`);
    console.log(`------------------------`);
    console.log(`Categories processing...`);
    const paints = snapshot.docs.map((doc) => {
      const brandId = doc.ref.parent.parent?.id;
      const _paint = doc.data();

      const setWords1 = _paint.set?.toLowerCase().split(/\s+/) ?? [];

      const matchedCategories = mapCategorys.filter((category) =>
        setWords1.includes(category.toLowerCase()),
      );

      let category = '';
      let isMetallic = false;
      let isTransparent = false;
      if (matchedCategories.length == 0) {
        category = _paint.set;
      } else {
        category = matchedCategories[0];
        if (
          matchedCategories.filter(
            (mc) => mc == 'Metallics' || mc == 'Metallic' || mc == 'Metal',
          ).length > 0
        ) {
          category = 'Metallics';
          isMetallic = true;
        }
        if (
          matchedCategories.filter((mc) => mc == 'Spray' || mc == 'Sprays')
            .length > 0
        ) {
          category = 'Spray';
        }
        if (
          matchedCategories.filter((mc) => mc == 'Acrylics' || mc == 'Acrylic')
            .length > 0
        ) {
          category = 'Acrylics';
        }
        if (matchedCategories.filter((mc) => mc == 'Transparent').length > 0) {
          isTransparent = true;
        }
      }

      return {
        id: doc.id,
        category,
        isMetallic,
        isTransparent,
        brandId,
        ..._paint,
      };
    });
    console.log(`Categories OK`);
    console.log(`------------------------`);

    const BATCH_SIZE = 200;

    const updateData = async (paint) => {
      const firestore = this.firebaseService.returnFirestore();
      const paintRef = firestore.doc(
        `brands/${paint.brandId}/paints/${paint.id}`,
      );
      await paintRef.update({
        category: paint.category,
        isMetallic: paint.isMetallic,
        isTransparent: paint.isTransparent,
      });
    };

    for (let i = 0; i < paints.length; i += BATCH_SIZE) {
      console.log(`Updating`, i, 'To', i + BATCH_SIZE, '...');
      const batch = paints.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(updateData));
      console.log(`------------------------`);
    }
    console.log(`END`);
    return paints;
  }

  async processCategoryCreate() {
    console.log(`processCategoryCreate`);
    console.log(`------------------------`);
    console.log(`Getting Paints...`);
    const firestore = this.firebaseService.returnFirestore();
    const snapshot = await firestore.collectionGroup(documents.paints).get();
    console.log(`Paints on memory Ok`);
    console.log(`------------------------`);
    console.log(`Categories processing...`);
    const paints = snapshot.docs.map((doc) => {
      const brandId = doc.ref.parent.parent?.id;
      const _paint = doc.data();
      return {
        id: doc.id,
        brandId,
        ..._paint,
      };
    });
    console.log(`Categories OK`);
    console.log(`------------------------`);

    const groupedBySet = paints.reduce((acc, item: any) => {
      const setName = item.category || 'Sin set';
      acc[setName] = (acc[setName] || 0) + 1;
      return acc;
    }, {});

    const keys = Object.keys(groupedBySet);

    const processCategory = async (category) => {
      const querySnapshot = await firestore
        .collection(documents.category)
        .where('name', '==', category)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        const currentDate = new Date();

        const collectionRef = firestore.collection(documents.category);
        const docRef = collectionRef.doc();

        const dataWithId = {
          name: category,
          created_at: currentDate,
          updated_at: currentDate,
          id: docRef.id,
        };

        await docRef.set(dataWithId);
        console.log('Category created!!!');
      } else {
        console.log('Category exist.');
      }
    };

    await Promise.all(keys.map(processCategory));
    return keys;
  }

  async createSubmission(dto: PendingPaintSubmissionDto): Promise<ApiResponse> {
    const firestore = this.firebaseService.returnFirestore();
    const now = new Date();
    const submission = {
      ...dto,
      status: dto.status || 'pending',
      created_at: now,
      updated_at: now,
    };
    try {
      const ref = await firestore
        .collection(documents.pending_paint_submissions)
        .add(submission);
      return {
        executed: true,
        message: '',
        data: { id: ref.id, ...submission },
      };
    } catch (error) {
      return { executed: false, message: error.message, data: null };
    }
  }

  async listSubmissions(
    status?: 'pending' | 'finalized',
  ): Promise<ApiResponse> {
    const firestore = this.firebaseService.returnFirestore();
    let query: any = firestore.collection(documents.pending_paint_submissions);
    if (status) {
      query = query.where('status', '==', status);
    }

    try {
      const snap = await query.orderBy('created_at', 'desc').get();

      // Recolecta todos los userIds únicos
      const submissions = snap.docs.map((doc) => {
        const data = doc.data() as any;
        return { id: doc.id, ...data };
      });
      const userIds: string[] = Array.from(
        new Set(
          submissions
            .map((s) => s.userId)
            .filter((uid): uid is string => !!uid),
        ),
      );

      // Si hay usuarios, los traemos en batch
      const emailsByUser: Record<string, string> = {};
      if (userIds.length) {
        // Firestore permite hasta 10 in() por consulta
        const chunks: string[][] = [];
        for (let i = 0; i < userIds.length; i += 10) {
          chunks.push(userIds.slice(i, i + 10));
        }
        await Promise.all(
          chunks.map(async (chunk) => {
            const usersSnap = await firestore
              .collection(documents.users)
              .where(this.firebaseService.documentIdFieldPath(), 'in', chunk)
              .get();
            usersSnap.docs.forEach((uDoc) => {
              const u = uDoc.data() as any;
              emailsByUser[uDoc.id] = u.email;
            });
          }),
        );
      }

      // Construye el array final
      const items = submissions.map((sub) => ({
        ...sub,
        email: sub.userId ? emailsByUser[sub.userId] || null : null,
      }));

      return { executed: true, message: '', data: items };
    } catch (error) {
      return { executed: false, message: error.message, data: null };
    }
  }

  async updateSubmission(
    id: string,
    dto: PendingPaintSubmissionDto,
  ): Promise<ApiResponse> {
    const firestore = this.firebaseService.returnFirestore();
    const ref = firestore
      .collection(documents.pending_paint_submissions)
      .doc(id);

    // 1. Fetch existing submission
    const snap = await ref.get();
    if (!snap.exists) {
      return { executed: false, message: 'Submission not found', data: null };
    }
    const existing = snap.data() as any;

    // 2. Compute new status and build updated object
    const newStatus = dto.status ?? existing.status;
    const updated = {
      ...existing,
      ...dto,
      status: newStatus,
      updated_at: new Date(),
    };

    try {
      // 3. If transitioning pending → finalized, validate & create paint
      if (existing.status !== 'finalized' && newStatus === 'finalized') {
        // Required fields for paint creation
        const missing: string[] = [];
        [
          'brandId',
          'code',
          'color',
          'hex',
          'name',
          'set',
          'b',
          'g',
          'r',
        ].forEach((key) => {
          if (updated[key] === undefined || updated[key] === null) {
            missing.push(key);
          }
        });
        if (missing.length) {
          return {
            executed: false,
            message: `Missing required fields: ${missing.join(', ')}`,
            data: null,
          };
        }

        // Duplicate check in Firestore
        const paintSnap = await firestore
          .collection(`brands/${updated.brandId}/paints`)
          .where('code', '==', updated.code)
          .limit(1)
          .get();
        if (!paintSnap.empty) {
          return {
            executed: false,
            message: `Paint with code "${updated.code}" already exists`,
            data: null,
          };
        }

        // Create the new paint
        const paintResp = await this.createPaint({
          brandId: updated.brandId,
          b: updated.b,
          g: updated.g,
          r: updated.r,
          code: updated.code,
          color: updated.color,
          hex: updated.hex,
          name: updated.name,
          set: updated.set,
        });
        if (!paintResp.executed) {
          return paintResp;
        }
      }

      // 4. Persist updated submission
      await ref.update(updated);

      // 5. Send notification if we just finalized
      if (existing.status !== 'finalized' && newStatus === 'finalized') {
        const payload = {
          title: '🎨 Your Paint Submission Is Finalized!',
          body: `Your submission "${updated.code || updated.name}" for brand "${updated.brandId}" (hex: ${updated.hex}) has been finalized.`,
        };

        if (updated.broadcast) {
          // Broadcast to all users
          const usersSnap = await firestore.collection(documents.users).get();
          const allTokens = usersSnap.docs.flatMap((doc) => {
            const u = doc.data() as any;
            return Array.isArray(u.fcmTokens) ? u.fcmTokens : [];
          });
          if (allTokens.length) {
            await this.firebaseService.sendMulticastNotification(
              allTokens,
              payload,
            );
          }
        } else if (updated.userId) {
          // Unicast to single user
          const userDoc = await firestore
            .collection(documents.users)
            .doc(updated.userId)
            .get();
          const userData = userDoc.data() as any;
          const tokens = Array.isArray(userData?.fcmTokens)
            ? userData.fcmTokens
            : [];
          if (tokens.length) {
            await this.firebaseService.sendMulticastNotification(
              tokens,
              payload,
            );
          }
        }
      }

      // 6. Return success
      return { executed: true, message: '', data: { id, ...updated } };
    } catch (error) {
      return { executed: false, message: error.message, data: null };
    }
  }
}
