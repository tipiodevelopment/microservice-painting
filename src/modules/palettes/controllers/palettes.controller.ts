import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PalettesService } from '../providers/palettes.service';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { executeError } from '../../../utils/error';
import { FirebaseAuthGuard } from 'src/modules/firebase/firebase-auth.guard';
import { SendSavePalettes } from '../dto/SendSavePalettes.dto';
import { SendSavePalettesPaints } from '../dto/SendSavePalettesPaints.dto';

@ApiTags('Palettes')
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
  @Get('/')
  @HttpCode(200)
  @ApiOperation({ summary: 'Save palettes' })
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiBody({
    type: SendSavePalettes,
    description: 'Save palettes dto',
  })
  async getPalettes(
    @Req() req,
    @Query('limit', ParseIntPipe) limit = 10,
    @Query('page', ParseIntPipe) page = 1,
  ) {
    try {
      const currentUser = req.user;
      return this._palettesService.getPalettes(currentUser.uid, limit, page);
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
  async savePalette(
    @Req() req,
    @Body()
    body: SendSavePalettes,
  ) {
    try {
      const currentUser = req.user;
      return this._palettesService.savePalette(currentUser.uid, body);
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('/:palette_id/paints')
  @HttpCode(200)
  @ApiOperation({ summary: 'Save palette paints' })
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiBody({
    type: SendSavePalettesPaints,
    description: 'Save palette paints dto',
  })
  async savePalettePaints(
    @Param('palette_id') palette_id: string,
    @Body()
    body: SendSavePalettesPaints[],
  ) {
    try {
      return this._palettesService.savePalettePaints(palette_id, body);
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Delete('/:palette_id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete palette paints' })
  @ApiResponse({ status: 200, description: 'OK' })
  async deletePalette(@Param('palette_id') palette_id: string) {
    try {
      return this._palettesService.deletePalette(palette_id);
    } catch (error) {
      executeError(error);
    }
  }
}
