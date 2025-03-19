import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  async healthCheck() {
    return { executed: true, message: 'OK', microservice: 'Painting' };
  }
}
