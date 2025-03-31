import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PalettesService } from '../providers/palettes.service';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { executeError } from '../../../utils/error';
import { FirebaseAuthGuard } from 'src/modules/firebase/firebase-auth.guard';
import { SendSavePalettes } from '../dto/SendSavePalettes.dto';

@Controller('palettes')
export class PalettesController {
  constructor(private readonly _palettesService: PalettesService) {}

  @Get('/health-check')
  @HttpCode(200)
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'OK' })
  async HealthCheck() {
    try {
      return this._palettesService.healthCheck();
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('/')
  @HttpCode(200)
  @ApiOperation({ summary: 'Save palettes' })
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiBody({
    type: SendSavePalettes,
    description: 'Save palettes dto',
  })
  async save(
    @Req() req,
    @Body()
    body: SendSavePalettes,
  ) {
    try {
      const currentUser = req.user;
      return this._palettesService.save(currentUser.uid, body);
    } catch (error) {
      executeError(error);
    }
  }
}
