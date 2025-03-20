import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ImageService } from '../providers/image.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { executeError } from '../../../utils/error';

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

  @Get('')
  getImages() {
    return { ok: true };
  }

  @Post('/upload')
  upload() {
    return { ok: true };
  }

  @Get('/:id_image/picks')
  getPicks() {
    return { ok: true };
  }

  @Post('/:id_image/picks')
  createPick() {
    return { ok: true };
  }
}
