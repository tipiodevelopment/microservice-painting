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
