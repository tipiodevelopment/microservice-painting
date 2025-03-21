import { Controller, Get, HttpCode } from '@nestjs/common';
import { BrandService } from '../providers/brand.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { executeError } from '../../../utils/error';

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
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'OK' })
  getBrands() {
    try {
      return this._brandService.getBrands();
    } catch (error) {
      executeError(error);
    }
  }
}
