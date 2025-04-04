import {
  Controller,
  Get,
  HttpCode,
  Post,
  Delete,
  Put,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { PaintService } from '../providers/paint.service';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { executeError } from '../../../utils/error';
import { SendCreatePaint } from '../dto/SendCreatePaint.dto';
import { SendUpdatePaint } from '../dto/SendUpdatePaint.dto';

@Controller('paint')
export class PaintController {
  constructor(private readonly _paintService: PaintService) {}

  @Get('/health-check')
  @HttpCode(200)
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'OK' })
  async HealthCheck() {
    try {
      return this._paintService.healthCheck();
    } catch (error) {
      executeError(error);
    }
  }

  @Get('/')
  getAllPaints(
    @Query('brandId') brandId?: string,
    @Query('name') name?: string,
    @Query('code') code?: string,
    @Query('hex') hex?: string,
    @Query('limit') limit = 10,
    @Query('page') page?: number,
  ) {
    return this._paintService.getAllPaints(
      { name, code, hex, brandId },
      Number(limit),
      page,
    );
  }

  @Get('/closest-by-brands')
  @ApiOperation({
    summary:
      'Get closest paints by hex color across multiple brands (paginated)',
  })
  @ApiResponse({
    status: 200,
    description: 'Closest paints from multiple brands',
  })
  getClosestPaintsFromBrands(
    @Query('hex') hex: string,
    @Query('brandIds') brandIdsRaw: string,
    @Query('limit') limit = 10,
    @Query('page') page = 1,
  ) {
    if (!hex) throw new Error('Hex color is required');
    if (!brandIdsRaw) throw new Error('brandIds are required');

    const brandIds = brandIdsRaw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    return this._paintService.findClosestPaintsAcrossBrands(
      brandIds,
      hex,
      Number(limit),
      Number(page),
    );
  }

  @Get('/:brandId')
  getPaints(
    @Param('brandId') brandId: string,
    @Query('name') name?: string,
    @Query('code') code?: string,
    @Query('hex') hex?: string,
    @Query('limit') limit = 10,
    @Query('page') page?: number,
  ) {
    return this._paintService.getPaints(
      brandId,
      { name, code, hex },
      Number(limit),
      page,
    );
  }

  @Post('/')
  @HttpCode(200)
  @ApiOperation({ summary: 'Create Paint' })
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiBody({
    type: SendCreatePaint,
    description: 'Create paint dto',
  })
  createPaint(
    @Body()
    requestService: SendCreatePaint,
  ) {
    try {
      return this._paintService.createPaint(requestService);
    } catch (error) {
      executeError(error);
    }
  }

  @Delete('/:brandId/:paintId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete Paint' })
  @ApiResponse({ status: 200, description: 'OK' })
  deletePaint(
    @Param('brandId') brandId: string,
    @Param('paintId') paintId: string,
  ) {
    try {
      return this._paintService.deletePaint(brandId, paintId);
    } catch (error) {
      executeError(error);
    }
  }

  @Put('/:brandId/:paintId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete Paint' })
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiBody({
    type: SendUpdatePaint,
    description: 'Update paint dto',
  })
  updatePaint(
    @Param('brandId') brandId: string,
    @Param('paintId') paintId: string,
    @Body()
    requestService: SendUpdatePaint,
  ) {
    try {
      return this._paintService.updatePaint(brandId, paintId, requestService);
    } catch (error) {
      executeError(error);
    }
  }

  @Post('update-name-lower')
  async updateNameLower() {
    const res = await this._paintService.updateNameLowerForAllPaints();
    return res;
  }
}
