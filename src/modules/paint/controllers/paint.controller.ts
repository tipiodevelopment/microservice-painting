import { Controller, Get, HttpCode, Req, UseGuards, Post, Delete, Update } from '@nestjs/common';
import { PaintService } from '../providers/paint.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { executeError } from '../../../utils/error';
import { FirebaseAuthGuard } from 'src/modules/firebase/firebase-auth.guard';

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
  getPaints(@Req() req) {
    return { ok: true };
  }

  @Post('')
  createPaint(@Req() req) {
    return { ok: true };
  }

  @Delete('')
  deletePaint(@Req() req) {
    return { ok: true };
  }


  
  @Update('')
  updatePaint(@Req() req) {
    return { ok: true };
  }

}
