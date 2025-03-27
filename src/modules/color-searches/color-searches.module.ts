import { Module } from '@nestjs/common';
import { ColorSearchesService } from './providers/color-searches.service';
import { ColorSearchesController } from './controllers/color-searches.controller';
import { FirebaseService } from '../firebase/firebase.service';
import { ConfigService } from '../../config/providers/config.service';

@Module({
  controllers: [ColorSearchesController],
  providers: [ColorSearchesService, FirebaseService, ConfigService],
})
export class ColorSearchesModule {}
