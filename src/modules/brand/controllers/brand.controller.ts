import { Controller, Get, HttpCode } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BrandService } from '../providers/brand.service';
import { executeError } from '../../../utils/error';

@ApiTags('BRAND')
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
  @ApiOperation({ summary: 'Retrieve all brands' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of brand data',
  })
  getBrands() {
    try {
      return this._brandService.getBrands();
    } catch (error) {
      executeError(error);
    }
  }
}
