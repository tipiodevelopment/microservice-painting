import { Module } from '@nestjs/common';
import { ImageService } from './providers/image.service';
import { ImageController } from './controllers/image.controller';
import { FirebaseService } from '../firebase/firebase.service';
import { ConfigService } from '../../config/providers/config.service';

@Module({
  controllers: [ImageController],
  providers: [ImageService, FirebaseService, ConfigService],
})
export class ImageModule {}
