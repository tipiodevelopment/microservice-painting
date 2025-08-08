import { Module } from '@nestjs/common';
import { ProjectService } from './providers/project.service';
import { ProjectController } from './controllers/project.controller';
import { FirebaseService } from '../firebase/firebase.service';
import { ConfigService } from '../../config/providers/config.service';

@Module({
  controllers: [ProjectController],
  providers: [ProjectService, FirebaseService, ConfigService],
})
export class ProjectModule {}
