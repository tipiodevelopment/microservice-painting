import { Injectable } from '@nestjs/common';

@Injectable()
export class ImageService {
  async healthCheck() {
    return { executed: true, message: 'OK', microservice: 'Painting' };
  }
}
