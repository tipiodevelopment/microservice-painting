import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { SendSavePalettes } from '../dto/SendSavePalettes.dto';
import { ApiResponse } from '../../../utils/interfaces';
import { documents } from '../../../utils/enums/documents.enum';
import { SendSavePalettesPaints } from '../dto/SendSavePalettesPaints.dto';

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
      const palettes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const getImage = async (palette_paints) => {
        const image = await this.firebaseService.getDocumentById(
          documents.user_color_images,
          palette_paints.image_color_picks_id,
        );

        palette_paints.image_color_picks = image.data;
      };

      // const getPaint = async (palette_paints) => {
      //   console.log('palette_paints.paint_id', palette_paints.paint_id);
      //   const paintQuery = await firestore
      //     .collectionGroup('paints')
      //     .where('code', '==', palette_paints.paint_id)
      //     .limit(1)
      //     .get()
      //     .catch((error) => console.error(error));
      //   // let paint = null;
      //   // if (!paintQuery.empty) {
      //   //   paint = paintQuery.docs[0].data();
      //   // }
      //   // palette_paints.paint = paint;
      // };

      const getPalettePaints = async (palette) => {
        const palettes_paints =
          await this.firebaseService.getDocumentsByProperty(
            documents.palettes_paints,
            'palette_id',
            palette.id,
          );
        palette.palettes_paints =
          palettes_paints?.data != null ? palettes_paints.data : [];

        await Promise.all(palette.palettes_paints.map(getImage));
        // await Promise.all(palette.palettes_paints.map(getPaint));
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
}
