import { Module } from '@nestjs/common';
import { NotificationService } from './providers/notification.service';
import { NotificationController } from './controllers/notification.controller';
import { FirebaseService } from '../firebase/firebase.service';
import { ConfigService } from '../../config/providers/config.service';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, FirebaseService, ConfigService],
})
export class NotificationModule {}
