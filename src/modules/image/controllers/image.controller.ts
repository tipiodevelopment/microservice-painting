import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiConsumes,
  ApiHeader,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';

import { FirebaseAuthGuard } from 'src/modules/firebase/firebase-auth.guard';
import { ImageService } from '../providers/image.service';
import { executeError } from '../../../utils/error';
import { SendUpdateImage } from '../dto/SendUpdateImage.dto';
import { SendCreatePick } from '../dto/SendCreatePick.dto';

// In-memory storage for file uploads (be cautious with large files).
const storage = multer.memoryStorage();

@ApiTags('Image')
@Controller('image')
export class ImageController {
  constructor(private readonly _imageService: ImageService) {}

  @Get('/health-check')
  @HttpCode(200)
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'OK' })
  async HealthCheck() {
    try {
      return this._imageService.healthCheck();
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get user images' })
  @ApiResponse({
    status: 200,
    description: 'Returns an array of images belonging to the current user',
  })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without a Firebase token (NOT for production).',
  })
  async getImages(@Req() req) {
    try {
      const currentUser = req.user;
      return this._imageService.getImages(currentUser);
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage }))
  @Post('/upload-file')
  @HttpCode(200)
  @ApiOperation({ summary: 'Upload a raw image file' })
  @ApiResponse({
    status: 200,
    description: 'Returns a URL of the uploaded file',
  })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without a Firebase token (NOT for production).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Image file to be uploaded (as multipart/form-data)',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadFile(
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ url: string }> {
    try {
      const currentUser = req.user;
      const url = await this._imageService.uploadFile(currentUser.uid, file);
      return { url };
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('/upload')
  @HttpCode(200)
  @ApiOperation({ summary: 'Upload image metadata' })
  @ApiResponse({
    status: 200,
    description: 'Saves the image path to Firestore',
  })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without a Firebase token (NOT for production).',
  })
  @ApiBody({
    type: SendUpdateImage,
    description: 'DTO containing image_path (must be a valid URL)',
  })
  async upload(@Req() req, @Body() requestService: SendUpdateImage) {
    try {
      const currentUser = req.user;
      return this._imageService.upload(currentUser, { ...requestService });
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('/:image_id/picks')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get color picks for a given image' })
  @ApiResponse({
    status: 200,
    description: 'Returns an array of picks associated with the image',
  })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without a Firebase token (NOT for production).',
  })
  async getPicks(@Req() req, @Param('image_id') image_id: string) {
    try {
      const currentUser = req.user;
      return this._imageService.getPicks(currentUser, image_id);
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('/:image_id/picks')
  @HttpCode(200)
  @ApiOperation({ summary: 'Create color picks for a given image' })
  @ApiResponse({
    status: 200,
    description: 'Returns the newly created picks',
  })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without a Firebase token (NOT for production).',
  })
  @ApiBody({
    type: [SendCreatePick],
    description: 'Array of color pick objects to create',
  })
  async createPick(
    @Req() req,
    @Param('image_id') image_id: string,
    @Body() requestService: SendCreatePick[],
  ) {
    try {
      const currentUser = req.user;
      return this._imageService.createPick(
        currentUser,
        image_id,
        requestService,
      );
    } catch (error) {
      executeError(error);
    }
  }
}
