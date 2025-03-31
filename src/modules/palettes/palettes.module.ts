import { Module } from '@nestjs/common';
import { PalettesService } from './providers/palettes.service';
import { PalettesController } from './controllers/palettes.controller';
import { FirebaseService } from '../firebase/firebase.service';
import { ConfigService } from '../../config/providers/config.service';

@Module({
  controllers: [PalettesController],
  providers: [PalettesService, FirebaseService, ConfigService],
})
export class PalettesModule {}
