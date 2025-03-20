import { Controller, Get, HttpCode, Req, UseGuards, Post } from '@nestjs/common';
import { ImageService } from '../providers/image.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { executeError } from '../../../utils/error';
import { FirebaseAuthGuard } from 'src/modules/firebase/firebase-Auth.guard';

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
  getImages(@Req() req) {
    return { ok: true };
  }

  @Post('/upload')
  upload(@Req() req) {
    return { ok: true };
  }


  @Get('/:id_image/picks')
  getPicks(@Req() req) {
    return { ok: true };
  }


  @Post('/:id_image/picks')
  createPick(@Req() req) {
    return { ok: true };
  }

}
