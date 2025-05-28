import { Module } from '@nestjs/common';
import { AuthService } from './providers/auth.service';
import { AuthController } from './controllers/auth.controller';
import { FirebaseService } from '../firebase/firebase.service';
import { ConfigService } from '../../config/providers/config.service';
import { MailjetModule } from '../mailjet/mailjet.module';

@Module({
  imports: [MailjetModule],
  controllers: [AuthController],
  providers: [AuthService, FirebaseService, ConfigService],
})
export class AuthModule {}
