import { Module } from '@nestjs/common';
import { EmailService } from './providers/email.service';
import { EmailController } from './controllers/email.controller';
import { FirebaseService } from '../firebase/firebase.service';
import { ConfigService } from '../../config/providers/config.service';

@Module({
  controllers: [EmailController],
  providers: [EmailService, FirebaseService, ConfigService],
})
export class EmailModule {}
