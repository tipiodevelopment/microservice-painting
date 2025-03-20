import { Module } from '@nestjs/common';
import { BrandService } from './providers/brand.service';
import { BrandController } from './controllers/brand.controller';
import { FirebaseService } from '../firebase/firebase.service';
import { ConfigService } from '../../config/providers/config.service';

@Module({
  controllers: [BrandController],
  providers: [BrandService, FirebaseService, ConfigService],
})
export class BrandModule {}
