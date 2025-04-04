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
      let query = firestore
        .collection(documents.palettes)
        .orderBy('name')
        .where('userId', '==', userId)
        .orderBy('userId');

      const totalSnapshot = await query.get();
      const totalPalettes = totalSnapshot.size;
      const totalPages = Math.ceil(totalPalettes / limit);

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
      const palettes = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          created_at: new Date(data.created_at._seconds * 1000),
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
              imageColorPick?.data.created_at._seconds * 1000,
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
              ..._data,
              created_at: new Date(_data?.created_at._seconds * 1000),
              updated_at: new Date(_data?.updated_at._seconds * 1000),
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
              created_at: new Date(pp?.created_at._seconds * 1000),
              added_at: new Date(pp?.added_at._seconds * 1000),
              updated_at: new Date(pp?.updated_at._seconds * 1000),
            };
          });
        } else palette.palettes_paints = [];

        await Promise.all(palette.palettes_paints.map(getImage));
        await Promise.all(palette.palettes_paints.map(getPaint));

        let image = null;
        if (palette.palettes_paints.length > 0) {
          if (
            palette.palettes_paints.filter((pp) => pp.image_color_picks != null)
              .length > 0
          ) {
            image = palette.palettes_paints.filter(
              (pp) => pp.image_color_picks != null,
            )[0].image_color_picks.image_path;
          }
        }
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

      if (palettesPaintsResponse.data.length > 0) {
        // Eliminar PALETTE PAINTS
        //  image_color_picks_id
        // Eliminar USER COLOR IMAGES
        // Eliminar IMAGE COLOR PICKS
      }

      {
        //Eliminar PALETTES
      }
      response.message = `Palettes and their dependencies removed`;
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }
}
