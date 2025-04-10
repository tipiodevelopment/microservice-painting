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
      // <-- FIN DEL NUEVO BLOQUE -->

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

    // Consulta base: obtener wishlist del usuario (activa)
    const querySnap = await firestore
      .collection(documents.wishlist)
      .where('user_id', '==', userId)
      .where('deleted', '==', false)
      .orderBy('priority', 'desc')
      .get();

    // Recuperar datos y anexar información extendida
    let results = [];
    for (const doc of querySnap.docs) {
      const data = doc.data();
      // Validar existencia de paint y brand
      const paintSnap = await firestore
        .doc(`brands/${data.brand_id}/${documents.paints}/${data.paint_id}`)
        .get();
      const brandSnap = await firestore
        .doc(`${documents.brands}/${data.brand_id}`)
        .get();
      // Si alguna no existe, omitir este registro
      if (!paintSnap.exists || !brandSnap.exists) continue;

      // Buscar paletas asociadas a este ítem: obtener nombres de las paletas donde aparece el ítem
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
        priority: data.priority,
        created_at: data.created_at,
        paint: paintSnap.data(),
        brand: brandSnap.data(),
        palettes: paletteNames,
      });
    }

    // Aplicar filtros en memoria si se especifican
    if (filters) {
      // Filtro por prioridad
      if (filters.priority !== undefined) {
        results = results.filter((item) => item.priority === filters.priority);
      }
      // Filtro por marca
      if (filters.brand_id) {
        results = results.filter((item) => item.brand_id === filters.brand_id);
      }
      // Búsqueda textual (en nombre de pintura o de marca)
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
      // Filtro por paleta: se busca el término en alguno de los nombres de las paletas asociadas
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
      // Ordenamiento
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

    // Aplicar paginación solo si se reciben los parámetros de limit y page
    if (filters && filters.limit && filters.page) {
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
    } else {
      return { userId, totalItems, whitelist: results };
    }
  }
}
