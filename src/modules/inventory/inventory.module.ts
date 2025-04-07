import { Module } from '@nestjs/common';
import { InventoryService } from './providers/inventory.service';
import { InventoryController } from './controllers/inventory.controller';
import { FirebaseService } from '../firebase/firebase.service';
import { ConfigService } from '../../config/providers/config.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, FirebaseService, ConfigService],
})
export class InventoryModule {}
