import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ProjectService } from '../providers/project.service';
import { executeError } from '../../../utils/error';
import { FirebaseAuthGuard } from 'src/modules/firebase/firebase-auth.guard';
import { SendAddItem } from '../dto/SendAddItem.dto';
import { SendCreateProject } from '../dto/SendCreateProject.dto';

@ApiTags('Project')
@Controller('project')
export class ProjectController {
  constructor(private readonly _projectService: ProjectService) {}

  @Get('/health-check')
  @HttpCode(200)
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'OK' })
  async HealthCheck() {
    try {
      return this._projectService.healthCheck();
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('/')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get my projects' })
  @ApiResponse({ status: 200, description: 'OK' })
  async getMyProjects(
    @Req() req,
    @Query('name') name,
    @Query('limit') limit: string = '10',
    @Query('page') page: string = '1',
  ) {
    try {
      console.log('limit', limit, typeof limit);
      const currentUser = req.user;
      return this._projectService.getMyProjects(
        currentUser.uid,
        { name },
        parseInt(limit),
        parseInt(page),
      );
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('/')
  @HttpCode(200)
  @ApiOperation({ summary: 'Add project' })
  @ApiResponse({ status: 200, description: 'OK' })
  async createProject(@Req() req, @Body() body: SendCreateProject) {
    try {
      const currentUser = req.user;
      return this._projectService.createProject(body, currentUser.uid);
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Put('/:project_id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Add project' })
  @ApiResponse({ status: 200, description: 'OK' })
  async updateProject(
    @Req() req,
    @Body() body: SendCreateProject,
    @Param('project_id') project_id: string,
  ) {
    try {
      const currentUser = req.user;
      return this._projectService.updateProject(
        project_id,
        currentUser.uid,
        body,
      );
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('/add-item')
  @HttpCode(200)
  @ApiOperation({ summary: 'Add project' })
  @ApiResponse({ status: 200, description: 'OK' })
  async projectAddItem(@Req() req, @Body() body: SendAddItem) {
    try {
      const currentUser = req.user;
      return this._projectService.addItem({
        ...body,
        userId: currentUser.uid,
      });
    } catch (error) {
      executeError(error);
    }
  }
}
