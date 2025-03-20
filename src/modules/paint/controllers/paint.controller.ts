import { Controller, Get, HttpCode, Post, Delete, Put } from '@nestjs/common';
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

  @Get('')
  getPaints() {
    return { ok: true };
  }

  @Post('')
  createPaint() {
    return { ok: true };
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
