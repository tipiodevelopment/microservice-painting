import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ColorSearchesService } from '../providers/color-searches.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { executeError } from '../../../utils/error';

@Controller('color-searches')
export class ColorSearchesController {
  constructor(private readonly _colorSearchesService: ColorSearchesService) {}

  @Get('/health-check')
  @HttpCode(200)
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'OK' })
  async HealthCheck() {
    try {
      return this._colorSearchesService.healthCheck();
    } catch (error) {
      executeError(error);
    }
  }

  @Post()
  async saveColorSearch(
    @Body()
    body: {
      userId: string;
      paints: { paint_id: string; brand_id: string }[];
    },
  ) {
    try {
      return this._colorSearchesService.saveColorSearch(
        body.userId,
        body.paints,
      );
    } catch (error) {
      executeError(error);
    }
  }

  @Get(':userId')
  async getUserColorSearches(@Param('userId') userId: string) {
    try {
      return this._colorSearchesService.getUserColorSearches(userId);
    } catch (error) {
      executeError(error);
    }
  }
}
