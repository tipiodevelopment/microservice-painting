import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../../modules/firebase/firebase.service';
import { ApiResponse } from '../../../utils/interfaces';
import { documents } from '../../../utils/enums/documents.enum';

@Injectable()
export class ImageService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async healthCheck() {
    return { executed: true, message: 'OK', microservice: 'Painting' };
  }

  async upload(user, data: { image_path: string }): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      const currentDate = new Date();
      const setOrAddDocument = await this.firebaseService.setOrAddDocument(
        documents.user_color_images,
        {
          user_id: user.uid,
          image_path: data.image_path,
          created_at: currentDate,
        },
      );
      response.data = {
        id: setOrAddDocument.data.id,
        user_id: user.id,
        image_path: data.image_path,
        created_at: currentDate,
      };
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async getPicks(user, image_id: string) {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      const firestore = this.firebaseService.returnFirestore();
      const query = await firestore
        .collection(documents.image_color_picks)
        .where('image_id', '==', image_id)
        .get();

      const row = query.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      response.data = row;
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async getImages(user) {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      const firestore = this.firebaseService.returnFirestore();
      const query = await firestore
        .collection(documents.user_color_images)
        .where('user_id', '==', user.uid)
        .get();

      const row = query.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      response.data = row;
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async createPick(
    user,
    image_id: string,
    data: {
      hex_color: string;
      b: number;
      g: number;
      r: number;
      x_coord: number;
      y_coord: number;
    },
  ): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      const currentDate = new Date();
      const setOrAddDocument = await this.firebaseService.setOrAddDocument(
        documents.image_color_picks,
        {
          image_id,
          ...data,
          created_at: currentDate,
        },
      );
      response.data = {
        id: setOrAddDocument.data.id,
        image_id,
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
