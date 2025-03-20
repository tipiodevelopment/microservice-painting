import { Injectable } from '@nestjs/common';

@Injectable()
export class BrandService {
  async healthCheck() {
    return { executed: true, message: 'OK', microservice: 'Painting' };
  }
}
