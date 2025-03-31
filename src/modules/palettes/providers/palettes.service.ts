import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { SendSavePalettes } from '../dto/SendSavePalettes.dto';
import { ApiResponse } from '../../../utils/interfaces';
import { documents } from '../../../utils/enums/documents.enum';

@Injectable()
export class PalettesService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async healthCheck() {
    return { executed: true, message: 'OK', microservice: 'Painting' };
  }

  async save(userId: string, data: SendSavePalettes): Promise<ApiResponse> {
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
}
