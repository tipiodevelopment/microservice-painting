import { Controller, Get, HttpCode, Req, UseGuards, Post } from '@nestjs/common';
import { BrandService } from '../providers/brand.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { executeError } from '../../../utils/error';
import { FirebaseAuthGuard } from 'src/modules/firebase/firebase-auth.guard';

@Controller('brand')
export class BrandController {
  constructor(private readonly _brandService: BrandService) {}

  @Get('/health-check')
  @HttpCode(200)
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'OK' })
  async HealthCheck() {
    try {
      return this._brandService.healthCheck();
    } catch (error) {
      executeError(error);
    }
  }

  @Get('')
  getBrands(@Req() req) {
    return { ok: true };
  }

}
