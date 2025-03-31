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
import { ImageService } from '../providers/image.service';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { executeError } from '../../../utils/error';
import { SendUpdateImage } from '../dto/SendUpdateImage.dto';
import { FirebaseAuthGuard } from 'src/modules/firebase/firebase-auth.guard';
import { SendCreatePick } from '../dto/SendCreatePick.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
const storage = multer.memoryStorage();

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
  @ApiOperation({ summary: 'Get images' })
  @ApiResponse({ status: 200, description: 'OK' })
  getImages(@Req() req) {
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
  @ApiOperation({ summary: 'Upload file image' })
  @ApiResponse({ status: 200, description: 'OK' })
  async uploadFile(
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ url: string }> {
    try {
      const currentUser = req.user;
      const url = await this._imageService.uploadFile(currentUser.uid, file);
      return {
        url,
      };
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('/upload')
  @HttpCode(200)
  @ApiOperation({ summary: 'Upload image info' })
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiBody({
    type: SendUpdateImage,
    description: 'Upload image dto',
  })
  upload(
    @Req() req,
    @Body()
    requestService: SendUpdateImage,
  ) {
    try {
      const currentUser = req.user;
      console.log('currentUser', currentUser);
      return this._imageService.upload(currentUser, { ...requestService });
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('/:image_id/picks')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get image picks' })
  @ApiResponse({ status: 200, description: 'OK' })
  getPicks(@Req() req, @Param('image_id') image_id: string) {
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
  @ApiOperation({ summary: 'Create picks' })
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiBody({
    type: SendCreatePick,
    description: 'Create picks dto',
  })
  createPick(
    @Req() req,
    @Param('image_id') image_id: string,
    @Body()
    requestService: SendCreatePick,
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
