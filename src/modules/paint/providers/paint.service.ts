import { Injectable } from '@nestjs/common';

@Injectable()
export class PaintService {
  async healthCheck() {
    return { executed: true, message: 'OK', microservice: 'Painting' };
  }
}
