import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { FirebaseService } from './firebase.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly firebaseService: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1) If we have x-user-uid, skip Firebase token check and set user.uid
    const devUid = request.headers['x-user-uid'];
    if (devUid) {
      request.user = { uid: devUid };
      return true;
    }

    // 2) Otherwise, extract the Bearer token
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    // 3) Validate token with Firebase
    try {
      const decodedToken = await this.firebaseService.verifyToken(token);
      request.user = decodedToken; // e.g. { uid: 'firebaseUid123', email: ... }
      return true;
    } catch (error) {
      console.log(error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.split(' ')[1];
  }
}
