import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { documents } from 'src/utils/enums/documents.enum';

@Injectable()
export class BrandService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async healthCheck() {
    return { executed: true, message: 'OK', microservice: 'Painting' };
  }

  async getBrands() {
    const responseBrands = await this.firebaseService.getCollection(
      documents.brands,
    );
    return responseBrands.data;
  }
}
