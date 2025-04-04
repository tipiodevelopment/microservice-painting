import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ColorSearchesService } from '../providers/color-searches.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { executeError } from '../../../utils/error';
import { FirebaseAuthGuard } from '../../../modules/firebase/firebase-auth.guard';

@ApiTags('Color Searches')
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

  @UseGuards(FirebaseAuthGuard)
  @Post('/')
  async saveColorSearch(
    @Req() req,
    @Body()
    body: {
      paints: { paint_id: string; brand_id: string }[];
    },
  ) {
    try {
      const currentUser = req.user;
      return this._colorSearchesService.saveColorSearch(
        currentUser.uid,
        body.paints,
      );
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('/')
  async getUserColorSearches(@Req() req) {
    try {
      const currentUser = req.user;
      return this._colorSearchesService.getUserColorSearches(currentUser.uid);
    } catch (error) {
      executeError(error);
    }
  }
}
