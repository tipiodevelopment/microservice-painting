import { Module } from '@nestjs/common';
import { PaintService } from './providers/paint.service';
import { PaintController } from './controllers/paint.controller';
import { FirebaseService } from '../firebase/firebase.service';
import { ConfigService } from '../../config/providers/config.service';

@Module({
  controllers: [PaintController],
  providers: [PaintService, FirebaseService, ConfigService],
})
export class PaintModule {}
