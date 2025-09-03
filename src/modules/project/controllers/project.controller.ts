import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ProjectService } from '../providers/project.service';
import { executeError } from '../../../utils/error';
import { FirebaseAuthGuard } from 'src/modules/firebase/firebase-auth.guard';
import { SendAddItem } from '../dto/SendAddItem.dto';
import { SendCreateProject } from '../dto/SendCreateProject.dto';
import { SendAddSharedProject } from '../dto/SendAddSharedProject';

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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my projects' })
  @ApiQuery({
    name: 'name',
    type: 'String',
    example: 'my project name',
    required: false,
    description: 'Parameters for name of a project',
  })
  @ApiQuery({
    name: 'limit',
    type: 'number',
    example: '10',
    required: false,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'page',
    type: 'number',
    example: '1',
    required: false,
    description: 'Page number (for pagination)',
  })
  @ApiResponse({
    status: 200,
    description: 'OK',
    schema: {
      example: {
        currentPage: 1,
        totalProjects: 1,
        totalPages: 1,
        limit: 10,
        projects: [
          {
            id: '7DrGJRMk10TnDxxRhtXc',
            name: '1 proyect',
            public: false,
            name_lower: '1 proyect',
            user_id: 'AnAbLmZcPwTsQ3ft1VMW5UOr1g63',
            created_at: '2025-08-07T14:22:46.000Z',
            updated_at: '2025-08-07T14:22:46.000Z',
            items: [
              {
                id: 'PZrdEG3gh7AkLHFuY8ES',
                project_id: '7DrGJRMk10TnDxxRhtXc',
                table: 'palettes',
                table_id: '1MQT7D7T1VvsYJmvaROO',
                user_id: 'AnAbLmZcPwTsQ3ft1VMW5UOr1g63',
                created_at: '2025-08-07T14:23:02.000Z',
                updated_at: '2025-08-07T14:23:02.000Z',
              },
            ],
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Error response',
    schema: {
      example: {
        statusCode: 500,
        message: 'Dynamic error based on code or logic fails',
      },
    },
  })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add project' })
  @ApiBody({
    type: SendCreateProject,
    description: 'Parameters for adding a project',
    examples: {
      default: {
        summary: 'Example project',
        value: {
          name: 'My First Project',
          public: true,
        },
      },
      private: {
        summary: 'Private project',
        value: {
          name: 'My Private Project',
          public: false,
        },
      },
      minimal: {
        summary: 'Minimal input (only required fields)',
        value: {
          name: 'Quick Project',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'OK',
    schema: {
      example: {
        executed: true,
        message: '',
        data: {
          name: '2 proyect',
          public: false,
          name_lower: '2 proyect',
          user_id: 'AnAbLmZcPwTsQ3ft1VMW5UOr1g63',
          created_at: '2025-09-03T19:08:02.627Z',
          updated_at: '2025-09-03T19:08:02.627Z',
          id: 'CDQ02j341SFILEYEd1UL',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Error response (example when validation or logic fails)',
    schema: {
      example: {
        executed: false,
        message: 'Dynamic error based on validation or logic fails',
        data: null,
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Error response',
    schema: {
      example: {
        statusCode: 500,
        message: 'Dynamic error based on code or logic fails',
      },
    },
  })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit project' })
  @ApiParam({ name: 'project_id', description: 'Project ID' })
  @ApiBody({
    type: SendCreateProject,
    description: 'Parameters for update a project',
    examples: {
      default: {
        summary: 'Example full edition',
        value: {
          name: 'First proyect edited',
          public: true,
        },
      },
      private: {
        summary: 'Only update the public flag',
        value: {
          public: true,
        },
      },
      minimal: {
        summary: 'Only update the name',
        value: {
          name: 'First proyect edited 2',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'OK',
    schema: {
      example: {
        executed: true,
        message: '',
        data: {
          name: '2 proyect Edited',
          public: false,
          name_lower: '2 proyect edited',
          user_id: 'AnAbLmZcPwTsQ3ft1VMW5UOr1g63',
          created_at: '2025-09-03T19:08:02.627Z',
          updated_at: '2025-09-03T19:08:02.627Z',
          id: 'CDQ02j341SFILEYEd1UL',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Error response (example when validation or logic fails)',
    schema: {
      example: {
        executed: false,
        message: 'Dynamic error based on validation or logic fails',
        data: null,
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Error response',
    schema: {
      example: {
        statusCode: 500,
        message: 'Dynamic error based on code or logic fails',
      },
    },
  })
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
  @Post('/item')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add item to project' })
  @ApiBody({
    type: SendAddItem,
    description: 'Parameters for add items to a project',
    examples: {
      default: {
        summary: 'Example add a palette',
        value: {
          project_id: '7DrGJRMk10TnDxxRhtXc',
          table: 'palettes',
          table_id: '1MQT7D7T1VvsYJmvaROO',
        },
      },
      private: {
        summary: 'Example add a image',
        value: {
          project_id: '7DrGJRMk10TnDxxRhtXc',
          table: 'user_color_images',
          table_id: '1MQT7D7T1VvsYJmvaROO',
        },
      },
      minimal: {
        summary: 'Example add a paint',
        value: {
          project_id: '7DrGJRMk10TnDxxRhtXc',
          table: 'paints',
          table_id: '1MQT7D7T1VvsYJmvaROO',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'OK',
    schema: {
      example: {
        executed: true,
        message: '',
        data: {
          project_id: 'AYvpYlQVVFb40LiC1QN0',
          table: 'palettes',
          table_id: '1MQT7D7T1VvsYJmvaROO',
          user_id: 'AnAbLmZcPwTsQ3ft1VMW5UOr1g63',
          created_at: '2025-09-03T20:17:19.021Z',
          updated_at: '2025-09-03T20:17:19.021Z',
          id: 'lMthMjBpTdmAqOve9i7P',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Error response (example when validation or logic fails)',
    schema: {
      example: {
        executed: false,
        message: 'Dynamic error based on validation or logic fails',
        data: null,
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Error response',
    schema: {
      example: {
        statusCode: 500,
        message: 'Dynamic error based on code or logic fails',
      },
    },
  })
  async projectAddItem(@Req() req, @Body() body: SendAddItem) {
    try {
      const currentUser = req.user;
      return this._projectService.addItem({
        ...body,
        user_id: currentUser.uid,
      });
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Delete('/item/:item_id')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete item from project' })
  @ApiParam({ name: 'item_id', description: 'item of a project ID' })
  @ApiResponse({
    status: 200,
    description: 'OK',
    schema: {
      example: {
        executed: true,
        message: '',
        data: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Error response (example when validation or logic fails)',
    schema: {
      example: {
        executed: false,
        message: 'Dynamic error based on validation or logic fails',
        data: null,
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Error response',
    schema: {
      example: {
        statusCode: 500,
        message: 'Dynamic error based on code or logic fails',
      },
    },
  })
  async projectDeleteItem(@Req() req, @Param('item_id') item_id: string) {
    try {
      const currentUser = req.user;
      return this._projectService.removeItem(item_id, currentUser.uid);
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Delete('/:project_id')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete project' })
  @ApiParam({ name: 'project_id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'OK',
    schema: {
      example: {
        executed: true,
        message: '',
        data: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Error response (example when validation or logic fails)',
    schema: {
      example: {
        executed: false,
        message: 'Dynamic error based on validation or logic fails',
        data: null,
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Error response',
    schema: {
      example: {
        statusCode: 500,
        message: 'Dynamic error based on code or logic fails',
      },
    },
  })
  async projectDelete(@Req() req, @Param('project_id') project_id: string) {
    try {
      const currentUser = req.user;
      return this._projectService.deleteProject(project_id, currentUser.uid);
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('/add-shared-project')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add shared Project' })
  @ApiBody({
    type: SendAddItem,
    description: 'Parameters for add record shared project',
    examples: {
      default: {
        summary: 'Example for sharing a project with a user',
        value: {
          project_id: '7DrGJRMk10TnDxxRhtXc',
          user_id: 'AnAbLmZcPwTsQ3ft1VMW5UOr1g63',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'OK',
    schema: {
      example: {
        executed: true,
        message: '',
        data: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Error response (example when validation or logic fails)',
    schema: {
      example: {
        executed: false,
        message: 'Dynamic error based on validation or logic fails',
        data: null,
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Error response',
    schema: {
      example: {
        statusCode: 500,
        message: 'Dynamic error based on code or logic fails',
      },
    },
  })
  async addSharedProject(@Req() req, @Body() body: SendAddSharedProject) {
    try {
      const currentUser = req.user;
      return this._projectService.addSharedProject({
        ...body,
        user_triggered_action: currentUser.uid,
      });
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Delete('/:project_id/shared-project')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete shared Project' })
  @ApiParam({ name: 'project_id', description: 'Project ID shared with me' })
  @ApiResponse({
    status: 200,
    description: 'OK',
    schema: {
      example: {
        executed: true,
        message: '',
        data: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Error response (example when validation or logic fails)',
    schema: {
      example: {
        executed: false,
        message: 'Dynamic error based on validation or logic fails',
        data: null,
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Error response',
    schema: {
      example: {
        statusCode: 500,
        message: 'Dynamic error based on code or logic fails',
      },
    },
  })
  async removeSharedProject(
    @Req() req,
    @Param('project_id') project_id: string,
  ) {
    try {
      const currentUser = req.user;
      return this._projectService.removeSharedProject({
        project_id,
        user_id: currentUser.uid,
      });
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('/shared-project')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get shared projects with me' })
  @ApiQuery({
    name: 'limit',
    type: 'number',
    example: '10',
    required: false,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'page',
    type: 'number',
    example: '1',
    required: false,
    description: 'Page number (for pagination)',
  })
  @ApiResponse({
    status: 200,
    description: 'OK',
    schema: {
      example: {
        currentPage: 1,
        totalProjects: 1,
        totalPages: 1,
        limit: 10,
        projects: [
          [
            {
              id: '7DrGJRMk10TnDxxRhtXc',
              name: '1 proyect',
              public: false,
              name_lower: '1 proyect',
              user_id: 'AnAbLmZcPwTsQ3ft1VMW5UOr1g63',
              created_at: '2025-08-07T14:22:46.000Z',
              updated_at: '2025-08-07T14:22:46.000Z',
              items: [
                {
                  id: 'PZrdEG3gh7AkLHFuY8ES',
                  project_id: '7DrGJRMk10TnDxxRhtXc',
                  table: 'palettes',
                  table_id: '1MQT7D7T1VvsYJmvaROO',
                  user_id: 'AnAbLmZcPwTsQ3ft1VMW5UOr1g63',
                  created_at: '2025-08-07T14:23:02.000Z',
                  updated_at: '2025-08-07T14:23:02.000Z',
                },
              ],
            },
          ],
        ],
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Error response',
    schema: {
      example: {
        statusCode: 500,
        message: 'Dynamic error based on code or logic fails',
      },
    },
  })
  async getSharedProjects(
    @Req() req,
    @Query('limit') limit: string = '10',
    @Query('page') page: string = '1',
  ) {
    try {
      console.log('limit', limit, typeof limit);
      const currentUser = req.user;
      return this._projectService.getSharedProjects(
        currentUser.uid,
        parseInt(limit),
        parseInt(page),
      );
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('/public-project')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get public projects' })
  @ApiQuery({
    name: 'limit',
    type: 'number',
    example: '10',
    required: false,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'page',
    type: 'number',
    example: '1',
    required: false,
    description: 'Page number (for pagination)',
  })
  @ApiResponse({
    status: 200,
    description: 'OK',
    schema: {
      example: {
        currentPage: 1,
        totalProjects: 1,
        totalPages: 1,
        limit: 10,
        projects: [
          {
            id: '7DrGJRMk10TnDxxRhtXc',
            name: '1 proyect',
            public: true,
            name_lower: '1 proyect',
            user_id: 'AnAbLmZcPwTsQ3ft1VMW5UOr1g63',
            created_at: '2025-08-07T14:22:46.000Z',
            updated_at: '2025-08-07T14:22:46.000Z',
            items: [
              {
                id: 'PZrdEG3gh7AkLHFuY8ES',
                project_id: '7DrGJRMk10TnDxxRhtXc',
                table: 'palettes',
                table_id: '1MQT7D7T1VvsYJmvaROO',
                user_id: 'AnAbLmZcPwTsQ3ft1VMW5UOr1g63',
                created_at: '2025-08-07T14:23:02.000Z',
                updated_at: '2025-08-07T14:23:02.000Z',
              },
            ],
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Error response',
    schema: {
      example: {
        statusCode: 500,
        message: 'Dynamic error based on code or logic fails',
      },
    },
  })
  async getPublicProjects(
    @Req() req,
    @Query('limit') limit: string = '10',
    @Query('page') page: string = '1',
  ) {
    try {
      console.log('limit', limit, typeof limit);
      return this._projectService.getPublicProjects(
        parseInt(limit),
        parseInt(page),
      );
    } catch (error) {
      executeError(error);
    }
  }
}
