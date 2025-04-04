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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';
import { PalettesService } from '../providers/palettes.service';
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

  /**
   * GET /palettes?limit=10&page=1
   * Retrieves a paginated list of palettes for the current user
   */
  @UseGuards(FirebaseAuthGuard)
  @Get('/')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get user palettes (paginated)' })
  @ApiResponse({
    status: 200,
    description: 'Returns a paginated list of palettes',
  })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without Firebase tokens (NOT for production).',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of palettes per page',
    example: 10,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
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

  /**
   * POST /palettes
   * Saves a new palette for the current user
   */
  @UseGuards(FirebaseAuthGuard)
  @Post('/')
  @HttpCode(200)
  @ApiOperation({ summary: 'Save a new palette' })
  @ApiResponse({ status: 200, description: 'Palette saved successfully' })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without Firebase tokens (NOT for production).',
  })
  @ApiBody({
    type: SendSavePalettes,
    description: 'Data needed to create a new palette',
  })
  async savePalette(@Req() req, @Body() body: SendSavePalettes) {
    try {
      const currentUser = req.user;
      return this._palettesService.savePalette(currentUser.uid, body);
    } catch (error) {
      executeError(error);
    }
  }

  /**
   * POST /palettes/:palette_id/paints
   * Adds paints to an existing palette
   */
  @UseGuards(FirebaseAuthGuard)
  @Post('/:palette_id/paints')
  @HttpCode(200)
  @ApiOperation({ summary: 'Add paints to a palette' })
  @ApiResponse({ status: 200, description: 'Paints added successfully' })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without Firebase tokens (NOT for production).',
  })
  @ApiBody({
    type: [SendSavePalettesPaints],
    description: 'Array of paints (paint_id, brand_id, etc.) to be added',
  })
  async savePalettePaints(
    @Param('palette_id') palette_id: string,
    @Body() body: SendSavePalettesPaints[],
  ) {
    try {
      return this._palettesService.savePalettePaints(palette_id, body);
    } catch (error) {
      executeError(error);
    }
  }

  /**
   * DELETE /palettes/:palette_id
   * Deletes a palette (and its associated documents) by ID
   */
  @UseGuards(FirebaseAuthGuard)
  @Delete('/:palette_id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a palette' })
  @ApiResponse({ status: 200, description: 'Palette deleted successfully' })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without Firebase tokens (NOT for production).',
  })
  async deletePalette(@Param('palette_id') palette_id: string) {
    try {
      return this._palettesService.deletePalette(palette_id);
    } catch (error) {
      executeError(error);
    }
  }
}
