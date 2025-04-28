import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { SendCreateInventory } from '../dto/SendCreateInventory.dto';
import { documents } from '../../../utils/enums/documents.enum';
import { ApiResponse } from '../../../utils/interfaces';
import { SendUpdateInventory } from '../dto/SendUpdateInventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async healthCheck() {
    return { executed: true, message: 'OK', microservice: 'Painting' };
  }

  async existInventory(inventoryId: string) {
    const firestore = this.firebaseService.returnFirestore();
    const inventoryResponse = await firestore
      .collection(documents.inventory)
      .doc(inventoryId)
      .get();

    const inventory = inventoryResponse.exists
      ? inventoryResponse.data()
      : null;

    if (!inventory)
      throw new Error(`Inventory with id: ${inventoryId} was not found`);

    return inventory;
  }

  async canManageTheInventory(userId, inventory, action): Promise<void> {
    const userResponse = await this.firebaseService.getDocumentById(
      documents.users,
      userId,
    );
    const user = userResponse.data;
    if (inventory.user_id != userId) {
      if (user?.is_admin != true)
        throw new Error(
          `You can not ${action} this inventory, only owner and a user with ADMIN role has grant it`,
        );
    }
  }

  async createInventory(
    userId: string,
    data: SendCreateInventory,
  ): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };
    try {
      const firestore = this.firebaseService.returnFirestore();
      const queryExistPaint = await firestore
        .collection(`brands/${data.brand_id}/paints`)
        .doc(data.paint_id)
        .get();
      if (!queryExistPaint.exists) throw new Error(`Paint was not found`);

      const querySnapshot = await firestore
        .collectionGroup(documents.inventory)
        .where('user_id', '==', userId)
        .where('paint_id', '==', data.paint_id)
        .where('brand_id', '==', data.brand_id)
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        response.message = 'Inventory with this Paint already exist.';
        const docData = doc.data();
        response.data = {
          id: doc.id,
          ...docData,
          created_at: new Date(docData?.created_at._seconds * 1000),
          updated_at: new Date(docData?.updated_at._seconds * 1000),
        };
      } else {
        const currentDate = new Date();
        const body = {
          user_id: userId,
          brand_id: data.brand_id,
          paint_id: data.paint_id,
          quantity: data.quantity,
          notes: data.notes,
          created_at: currentDate,
          updated_at: currentDate,
        };
        const inventoryResponse = await this.firebaseService.setOrAddDocument(
          documents.inventory,
          body,
        );
        if (inventoryResponse.executed) {
          response.data = {
            id: inventoryResponse.data.id,
            ...body,
          };
        } else {
        }
      }

      const inventorySnapshot = await firestore
        .collection(documents.wishlist)
        .where('user_id', '==', userId)
        .where('brand_id', '==', data.brand_id)
        .where('paint_id', '==', data.paint_id)
        .limit(1)
        .get();
      if (!inventorySnapshot.empty) {
        for (const doc of inventorySnapshot.docs) {
          await doc.ref.delete();
        }
      }

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
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async updateInventory(
    userId: string,
    inventoryId: string,
    data: SendUpdateInventory,
  ): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };
    try {
      const inventory = await this.existInventory(inventoryId);
      await this.canManageTheInventory(userId, inventory, 'update');
      const currentDate = new Date();
      await this.firebaseService.setOrAddDocument(
        documents.inventory,
        { ...data, updated_at: currentDate },
        inventoryId,
      );
      const _inventory = (
        await this.firebaseService.getDocumentById(
          documents.inventory,
          inventoryId,
        )
      ).data;
      response.data = {
        id: inventoryId,
        ..._inventory,
        created_at: new Date(_inventory?.created_at._seconds * 1000),
        updated_at: new Date(_inventory?.updated_at._seconds * 1000),
      };
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async deleteInventory(userId: string, inventoryId: string) {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };
    try {
      const inventory = await this.existInventory(inventoryId);
      await this.canManageTheInventory(userId, inventory, 'delete');

      const deleteResponse = await this.firebaseService.deleteDocument(
        documents.inventory,
        inventoryId,
      );
      response.data = deleteResponse.data;
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async getInventory() {}

  async getInventories(
    userId: string,
    filters: {
      brand?: string;
      brandId?: string;
      stock?: number;
      onlyInStock?: boolean;
      minStock?: number;
      maxStock?: number;
    },
    limit: number,
    page: number = 1,
  ) {
    console.log('getInventories filters:', filters);
    const firestore = this.firebaseService.returnFirestore();

    let query = firestore
      .collection(documents.inventory)
      .where('user_id', '==', userId);

    // ✅ Aplicación de filtros (sin else)
    if (filters.stock !== undefined) {
      query = query.where('quantity', '==', filters.stock);
    }

    if (filters.onlyInStock) {
      query = query.where('quantity', '>', 0);
    }

    if (filters.minStock !== undefined) {
      query = query.where('quantity', '>=', filters.minStock);
    }

    if (filters.maxStock !== undefined) {
      query = query.where('quantity', '<=', filters.maxStock);
    }

    if (filters.brandId) {
      query = query.where('brand_id', '==', filters.brandId);
    }

    if (filters.brand) {
      const brandSnap = await firestore
        .collection(documents.brands)
        .where('name', '==', filters.brand)
        .limit(1)
        .get();
      if (brandSnap.empty) {
        return {
          currentPage: 1,
          totalPaints: 0,
          totalPages: 0,
          limit,
          inventories: [],
        };
      }
      const brandId = brandSnap.docs[0].id;
      query = query.where('brand_id', '==', brandId);
    }

    // 🔢 Paginación
    const totalSnapshot = await query.get();

    const totalPaints = totalSnapshot.size;
    const totalPages = Math.ceil(totalPaints / limit);
    const currentPage = Math.min(Math.max(page, 1), totalPages);
    const startIndex = (currentPage - 1) * limit;
    let startAfterDoc = null;

    if (startIndex > 0 && startIndex < totalSnapshot.docs.length) {
      startAfterDoc = totalSnapshot.docs[startIndex - 1];
    }

    if (startAfterDoc) {
      query = query.startAfter(startAfterDoc);
    }

    const snapshot = await query.limit(limit).get();
    const inventories = snapshot.docs.map((doc) => {
      const _data = doc.data();
      return {
        id: doc.id,
        ..._data,
        created_at: new Date(_data?.created_at._seconds * 1000),
        updated_at: new Date(_data?.updated_at._seconds * 1000),
      };
    });

    // 🔁 Enriquecer con datos de paint y paletas
    const getPaint = async (inventory) => {
      const paintRef = firestore.doc(
        `brands/${inventory.brand_id}/paints/${inventory.paint_id}`,
      );
      const paintSnapshot = await paintRef.get();
      const _data = paintSnapshot.data();

      inventory.paint = {
        ..._data,
        created_at: new Date(_data?.created_at._seconds * 1000),
        updated_at: new Date(_data?.updated_at._seconds * 1000),
        brandId: inventory.brand_id,
        category: '',
        isMetallic: false,
        isTransparent: false,
      };

      // Paletas relacionadas con esta pintura del usuario
      const palettesPaintsSnap = await firestore
        .collection('palettes_paints')
        .where('paint_id', '==', inventory.paint_id)
        .where('brand_id', '==', inventory.brand_id)
        .get();

      const paletteNames: string[] = [];

      for (const doc of palettesPaintsSnap.docs) {
        const paletteData = doc.data();
        const paletteSnap = await firestore
          .collection(documents.palettes)
          .doc(paletteData.palette_id)
          .get();

        if (paletteSnap.exists && paletteSnap.data()?.userId === userId) {
          paletteNames.push(paletteSnap.data().name);
        }
      }

      inventory.palettes = paletteNames;
    };

    await Promise.all(inventories.map(getPaint));

    return {
      currentPage,
      totalPaints,
      totalPages,
      limit,
      inventories,
    };
  }
}
