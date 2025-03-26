import {
  Controller,
  Get,
  HttpCode,
  Post,
  Delete,
  Put,
  Param,
  Query,
} from '@nestjs/common';
import { PaintService } from '../providers/paint.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { executeError } from '../../../utils/error';

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
    @Query('name') name?: string,
    @Query('code') code?: string,
    @Query('hex') hex?: string,
    @Query('limit') limit = 10,
    @Query('page') page?: number,
  ) {
    return this._paintService.getAllPaints(
      { name, code, hex },
      Number(limit),
      page,
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

  @Post('')
  createPaint() {
    return { ok: true };
  }

  @Post('update-name-lower')
  async updateNameLower() {
    const res = await this._paintService.updateNameLowerForAllPaints();
    return res;
  }

  @Delete('')
  deletePaint() {
    return { ok: true };
  }

  @Put('')
  updatePaint() {
    return { ok: true };
  }
}
