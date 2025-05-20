import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { SendSavePalettes } from '../dto/SendSavePalettes.dto';
import { ApiResponse } from '../../../utils/interfaces';
import { documents } from '../../../utils/enums/documents.enum';
import { SendSavePalettesPaints } from '../dto/SendSavePalettesPaints.dto';
import * as moment from 'moment';

@Injectable()
export class PalettesService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async healthCheck() {
    return { executed: true, message: 'OK', microservice: 'Painting' };
  }

  async getMostUsedPaints(userId: string): Promise<ApiResponse> {
    const response: ApiResponse = { executed: true, message: '', data: null };
    try {
      const firestore = this.firebaseService.returnFirestore();

      // 1. Obtener todas las paletas del usuario.
      const palettesSnapshot = await firestore
        .collection(documents.palettes)
        .where('userId', '==', userId)
        .get();
      const paletteInfoMap = new Map<
        string,
        { name: string; created_at: Date }
      >();
      const paletteIds: string[] = [];
      palettesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        paletteIds.push(doc.id);
        paletteInfoMap.set(doc.id, {
          name: data.name,
          // Ajusta esto según tu campo real en Firestore
          created_at: data.created_at.toDate
            ? data.created_at.toDate()
            : new Date(data.created_at),
        });
      });

      // 2. Obtener todos los documents de "palettes_paints" de esas paletas.
      const allPalettePaints: Array<{
        palette_id: string;
        brand_id: string;
        paint_id: string;
      }> = [];
      if (paletteIds.length > 0) {
        const chunkSize = 10;
        for (let i = 0; i < paletteIds.length; i += chunkSize) {
          const chunk = paletteIds.slice(i, i + chunkSize);
          const snap = await firestore
            .collection(documents.palettes_paints)
            .where('palette_id', 'in', chunk)
            .get();
          snap.docs.forEach((d) => {
            const dData = d.data();
            allPalettePaints.push({
              palette_id: dData.palette_id,
              brand_id: dData.brand_id,
              paint_id: dData.paint_id,
            });
          });
        }
      }

      // 3. Contar y agrupar, acumulando también lista de paletas.
      type Usage = {
        count: number;
        brand_id: string;
        paint_id: string;
        paletteIds: Set<string>;
      };
      const usageMap = new Map<string, Usage>();
      allPalettePaints.forEach((item) => {
        const key = `${item.brand_id}_${item.paint_id}`;
        if (!usageMap.has(key)) {
          usageMap.set(key, {
            count: 0,
            brand_id: item.brand_id,
            paint_id: item.paint_id,
            paletteIds: new Set(),
          });
        }
        const u = usageMap.get(key)!;
        u.count++;
        u.paletteIds.add(item.palette_id);
      });

      // 4. Inventario: map key -> doc.id
      const invSnapshot = await firestore
        .collection(documents.inventory)
        .where('user_id', '==', userId)
        .get();
      const inventoryMap = new Map<string, string>();
      invSnapshot.docs.forEach((doc) => {
        const d = doc.data();
        const key = `${d.brand_id}_${d.paint_id}`;
        inventoryMap.set(key, doc.id);
      });

      // 5. Wishlist: map key -> doc.id
      const wlSnapshot = await firestore
        .collection(documents.wishlist)
        .where('user_id', '==', userId)
        .where('deleted', '==', false)
        .get();
      const wishlistMap = new Map<string, string>();
      wlSnapshot.docs.forEach((doc) => {
        const d = doc.data();
        const key = `${d.brand_id}_${d.paint_id}`;
        wishlistMap.set(key, doc.id);
      });

      // 6. Armado de resultados base
      const aggregated = Array.from(usageMap.values()).map((u) => {
        const key = `${u.brand_id}_${u.paint_id}`;
        // convertir paletteIds a array de objetos con nombre y fecha
        const palettes = Array.from(u.paletteIds).map((pid) => {
          const info = paletteInfoMap.get(pid)!;
          return {
            id: pid,
            name: info.name,
            created_at: info.created_at,
          };
        });
        return {
          brand_id: u.brand_id,
          paint_id: u.paint_id,
          count: u.count,
          palette_info: palettes,
          in_inventory: inventoryMap.has(key),
          in_whitelist: wishlistMap.has(key),
          inventory_id: inventoryMap.get(key) || null,
          wishlist_id: wishlistMap.get(key) || null,
        };
      });

      // 7. Para cada item, añadimos datos de paint y brand en paralelo
      const results = await Promise.all(
        aggregated.map(async (item) => {
          const paintDoc = await firestore
            .doc(`${documents.brands}/${item.brand_id}/paints/${item.paint_id}`)
            .get();
          const paintData = paintDoc.exists ? paintDoc.data() : null;

          const brandDoc = await firestore
            .doc(`${documents.brands}/${item.brand_id}`)
            .get();
          const brandData = brandDoc.exists ? brandDoc.data() : null;

          return {
            ...item,
            paint: paintData,
            brand: brandData,
          };
        }),
      );

      // 8. Ordenar por uso descendente
      results.sort((a, b) => b.count - a.count);

      response.data = results;
    } catch (error) {
      response.executed = false;
      response.message = error.message;
    }
    return response;
  }

  async getAllPalettesSimple(userId: string): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      const firestore = this.firebaseService.returnFirestore();
      const snapshot = await firestore
        .collection(documents.palettes)
        .orderBy('name')
        .where('userId', '==', userId)
        .orderBy('userId')
        .orderBy('created_at', 'desc')
        .select('name')
        .get();

      const palettes = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
        };
      });
      response.data = palettes;
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async getPalettes(
    userId: string,
    limit: number,
    page: number,
  ): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };
    try {
      const firestore = this.firebaseService.returnFirestore();
      const brandsRef = firestore.collection(documents.brands);
      const brandsSnapshot = await brandsRef.get();
      const brands = brandsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      let query = firestore
        .collection(documents.palettes)
        .where('userId', '==', userId)
        .orderBy('created_at', 'desc');

      const totalSnapshot = await query.get();
      const totalPalettes = totalSnapshot.size;
      const totalPages = Math.ceil(totalPalettes / limit);

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
      const palettes = snapshot.docs.map((doc) => {
        const data = doc.data();
        const createdAt = data.created_at?._seconds
          ? new Date(data.created_at._seconds * 1000)
          : new Date();

        return {
          id: doc.id,
          name: data.name,
          created_at: createdAt,
        };
      });

      const getImage = async (palette_paints) => {
        const imageColorPickData = await this.firebaseService.getDocumentById(
          documents.image_color_picks,
          palette_paints.image_color_picks_id,
        );

        if (imageColorPickData?.data != null) {
          const imageColorPick = await this.firebaseService.getDocumentById(
            documents.user_color_images,
            imageColorPickData.data?.image_id,
          );

          palette_paints.image_color_picks = {
            ...imageColorPickData.data,
            ...imageColorPick.data,
            created_at: new Date(
              imageColorPick?.data?.created_at?._seconds
                ? imageColorPick.data.created_at._seconds * 1000
                : Date.now(),
            ),
          };
        } else palette_paints.image_color_picks = null;
      };

      const getPaint = async (palette_paints) => {
        let paint = null;
        if (palette_paints?.brand_id) {
          const paintDoc = await firestore
            .collection(`brands/${palette_paints.brand_id}/paints`)
            .doc(palette_paints.paint_id)
            .get();
          if (paintDoc.exists) {
            const _data = paintDoc.data();
            paint = {
              id: palette_paints.paint_id,
              ..._data,
              created_at: new Date(
                _data?.created_at?._seconds
                  ? _data.created_at._seconds * 1000
                  : Date.now(),
              ),

              updated_at: new Date(
                _data?.updated_at?._seconds
                  ? _data.updated_at._seconds * 1000
                  : Date.now(),
              ),
            };
          }
        }
        palette_paints.paint = paint;
      };

      const getPalettePaints = async (palette) => {
        const palettes_paints =
          await this.firebaseService.getDocumentsByProperty(
            documents.palettes_paints,
            'palette_id',
            palette.id,
          );

        if (palettes_paints?.data?.length > 0) {
          palette.palettes_paints = palettes_paints.data.map((pp) => {
            return {
              ...pp,
              created_at: new Date(
                pp?.created_at?._seconds
                  ? pp.created_at._seconds * 1000
                  : Date.now(),
              ),
              added_at: new Date(
                pp?.added_at?._seconds
                  ? pp.added_at._seconds * 1000
                  : Date.now(),
              ),
              updated_at: new Date(
                pp?.updated_at?._seconds
                  ? pp.updated_at._seconds * 1000
                  : Date.now(),
              ),
            };
          });
        } else palette.palettes_paints = [];

        await Promise.all(palette.palettes_paints.map(getImage));
        await Promise.all(palette.palettes_paints.map(getPaint));

        let image = null;
        const paintSelections = [];
        if (palette.palettes_paints.length > 0) {
          if (
            palette.palettes_paints.filter((pp) => pp.image_color_picks != null)
              .length > 0
          ) {
            image = palette.palettes_paints.filter(
              (pp) => pp.image_color_picks != null,
            )[0].image_color_picks.image_path;
          }

          palette.palettes_paints.forEach((pp) => {
            const brand: any = brands.find((b) => b.id == pp.brand_id);
            console.log(pp.paint);
            const ps = {
              colorHex: pp.paint.hex ?? '',
              paintId: pp.paint_id ?? '',
              paintName: pp.paint.name ?? '',
              paintBrand: brand?.name ? brand.name : '',
              brandAvatar: brand?.logo_url ? brand.logo_url : '',
              matchPercentage: 0,
              paintColorHex: pp.paint.hex ?? '',
              paintBrandId: pp.brand_id ?? '',
              paintCode: pp.paint.code ?? '',
              paintBarcode: pp.paint.barcode ?? '',
            };
            paintSelections.push(ps);
          });
        }
        palette.PaintSelections = paintSelections;
        palette.image = image;
        palette.total_paints = palette.palettes_paints.length;
        palette.created_at_text = moment(palette.created_at).fromNow();
      };

      await Promise.all(palettes.map(getPalettePaints));

      response.data = {
        currentPage,
        totalPalettes,
        totalPages,
        limit,
        palettes,
      };
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async savePalette(
    userId: string,
    data: SendSavePalettes,
  ): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      const currentDate = new Date();
      const setOrAddDocument = await this.firebaseService.setOrAddDocument(
        documents.palettes,
        {
          userId,
          ...data,
          created_at: currentDate,
        },
      );
      response.data = {
        id: setOrAddDocument.data.id,
        userId,
        ...data,
        created_at: currentDate,
      };

      // try {
      //   const usersSnapshot = await this.firebaseService.getCollection(
      //     documents.users,
      //   );
      //   const tokens: string[] = [];
      //   usersSnapshot.data?.forEach((user) => {
      //     if (Array.isArray(user.fcmTokens)) {
      //       tokens.push(...user.fcmTokens);
      //     }
      //   });
      //   await this.firebaseService.sendMulticastNotification(tokens, {
      //     title: '🎨 New Palette Added',
      //     body: 'Check out the latest color combinations!',
      //   });
      // } catch {}
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async savePalettePaints(
    palette_id: string,
    data: SendSavePalettesPaints[],
  ): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      const paletteResponse = await this.firebaseService.getDocumentById(
        documents.palettes,
        palette_id,
      );

      if (paletteResponse.data == null) throw new Error(`Palette not found.`);

      const firestore = this.firebaseService.returnFirestore();
      const batch = firestore.batch();
      const collectionRef = firestore.collection(documents.palettes_paints);

      const currentDate = new Date();
      const responseData = [];
      data.forEach((_data: SendSavePalettesPaints) => {
        const docRef = collectionRef.doc();
        if (!_data?.image_color_picks_id) _data.image_color_picks_id = null;
        const palettePaints = {
          id: docRef.id,
          palette_id,
          ..._data,
          added_at: currentDate,
          created_at: currentDate,
          updated_at: currentDate,
        };
        responseData.push({ ...palettePaints });
        batch.set(docRef, { ...palettePaints });
      });
      await batch.commit();

      response.data = responseData;
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async deletePalette(palette_id: string): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };
    /*
      Flow cascade delete:
        Delete user_color_images (images)
        Delete image_color_picks
        Delete palettes_paints
        Delete palettes
     */

    try {
      const paletteResponse = await this.firebaseService.getDocumentById(
        documents.palettes,
        palette_id,
      );
      if (!paletteResponse.executed || paletteResponse.data == null)
        throw new Error(`Palette not found.`);

      const palettesPaintsResponse =
        await this.firebaseService.getDocumentsByProperty(
          documents.palettes_paints,
          'palette_id',
          palette_id,
        );
      let imageColorPicksResponse = null;
      let user_color_images_ids = null;

      if (palettesPaintsResponse.data.length > 0) {
        const image_color_picks_ids = [
          ...new Set(
            palettesPaintsResponse.data.map((pp) => pp?.image_color_picks_id),
          ),
        ];
        imageColorPicksResponse = await this.firebaseService.getDocumentsByIds(
          documents.image_color_picks,
          image_color_picks_ids,
        );

        if (imageColorPicksResponse.data?.length > 0) {
          const image_color_picks = imageColorPicksResponse.data;
          // DELETE IMAGE
          {
            user_color_images_ids = [
              ...new Set(image_color_picks.map((icp) => icp?.image_id)),
            ];
            if (user_color_images_ids?.length > 0) {
              const deleteUserColorImages = async (id) => {
                await this.firebaseService.deleteDocument(
                  documents.user_color_images,
                  id,
                );
              };
              await Promise.all(
                user_color_images_ids.map(deleteUserColorImages),
              );
            }
          }
          // DELETE IMAGE
          // DELETE IMAGE COLOR PICKS
          {
            const deleteImageColorPicks = async (icp) => {
              await this.firebaseService.deleteDocument(
                documents.image_color_picks,
                icp.id,
              );
            };
            await Promise.all(image_color_picks.map(deleteImageColorPicks));
          }
          // DELETE IMAGE COLOR PICKS
        }
        // DELETE PALETTE PAINTS
        {
          const deletePalettePaints = async (pp) => {
            await this.firebaseService.deleteDocument(
              documents.palettes_paints,
              pp.id,
            );
          };
          await Promise.all(
            palettesPaintsResponse.data.map(deletePalettePaints),
          );
        }
        // DELETE PALETTE PAINTS
      }

      // DELETE PALETTE
      await this.firebaseService.deleteDocument(documents.palettes, palette_id);
      console.log('Delete success');
      response.data = {
        deletedPalete: {
          palette: paletteResponse.data,
          palettePaints: palettesPaintsResponse.data,
          imageColorPicks: imageColorPicksResponse?.data
            ? imageColorPicksResponse?.data
            : null,
          user_color_images_ids,
        },
      };
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }
}
