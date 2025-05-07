import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import { NotificationService } from '../providers/notification.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';
import { executeError } from '../../../utils/error';
import { FirebaseAuthGuard } from 'src/modules/firebase/firebase-auth.guard';
import { RegisterTokenDto } from '../dto/register-token.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly svc: NotificationService) {}

  @Get('/health-check')
  @HttpCode(200)
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'OK' })
  async healthCheck() {
    try {
      return this.svc.healthCheck();
    } catch (error) {
      executeError(error);
    }
  }

  @Post('register-token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Register FCM token for user' })
  @ApiResponse({ status: 200, description: 'Token registered' })
  @ApiBody({ type: RegisterTokenDto })
  async registerToken(@Body() dto: RegisterTokenDto) {
    try {
      return await this.svc.registerToken(dto);
    } catch (err) {
      executeError(err);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({ status: 201, description: 'Notification created' })
  @ApiBody({ type: CreateNotificationDto })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without a Firebase token (NOT for production).',
  })
  async create(@Req() req, @Body() dto: CreateNotificationDto) {
    try {
      return this.svc.create(dto);
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Get()
  @ApiOperation({ summary: 'List notifications' })
  @ApiQuery({ name: 'recipientId', required: false })
  @ApiQuery({ name: 'isSent', required: false, type: Boolean })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without a Firebase token (NOT for production).',
  })
  async findAll(
    @Query('recipientId') recipientId?: string,
    @Query('isSent') isSent?: string,
  ) {
    try {
      const filter: any = {};
      if (recipientId) filter.recipientId = recipientId;
      if (isSent !== undefined) filter.isSent = isSent === 'true';
      return this.svc.findAll(filter);
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get one notification by ID' })
  @ApiParam({ name: 'id' })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without a Firebase token (NOT for production).',
  })
  async findOne(@Param('id') id: string) {
    try {
      return this.svc.findOne(id);
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Put(':id')
  @ApiOperation({ summary: 'Update a notification' })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateNotificationDto })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without a Firebase token (NOT for production).',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateNotificationDto) {
    try {
      return this.svc.update(id, dto);
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Post(':id/send')
  @ApiOperation({ summary: 'Manually send a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @HttpCode(200)
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without a Firebase token (NOT for production).',
  })
  async sendNow(@Param('id') id: string) {
    try {
      return this.svc.sendNow(id);
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id' })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without a Firebase token (NOT for production).',
  })
  async remove(@Param('id') id: string) {
    try {
      return this.svc.remove(id);
    } catch (error) {
      executeError(error);
    }
  }
}
