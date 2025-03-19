import { Controller, Get, HttpCode, Req, UseGuards } from '@nestjs/common';
import { AuthService } from '../providers/auth.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { executeError } from '../../../utils/error';
import { FirebaseAuthGuard } from 'src/modules/firebase/firebase-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('/health-check')
  @HttpCode(200)
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'OK' })
  async HealthCheck() {
    try {
      return this.authService.healthCheck();
    } catch (error) {
      executeError(error);
    }
  }

  @Get('/profile')
  @UseGuards(FirebaseAuthGuard)
  getProfile(@Req() req) {
    return { user: req.user };
  }
}
