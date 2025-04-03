import { Module } from '@nestjs/common';
import { WhiteListService } from './providers/white-list.service';
import { WhiteListController } from './controllers/white-list.controller';
import { FirebaseService } from '../firebase/firebase.service';
import { ConfigService } from '../../config/providers/config.service';

@Module({
  controllers: [WhiteListController],
  providers: [WhiteListService, FirebaseService, ConfigService],
})
export class WhiteListModule {}
