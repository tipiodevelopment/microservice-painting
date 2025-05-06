import { Module } from '@nestjs/common';
import { FlagsService } from './providers/flags.service';
import { FlagsController } from './controllers/flags.controller';
import { FirebaseService } from '../firebase/firebase.service';
import { ConfigService } from '../../config/providers/config.service';

@Module({
  controllers: [FlagsController],
  providers: [FlagsService, FirebaseService, ConfigService],
})
export class FlagsModule {}
