import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../providers/auth.service';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { executeError } from '../../../utils/error';
import { SendAuthRegister } from '../dtos/SendAuthRegister.dto';
import { SendSetRole } from '../dtos/SendSetRole.dto';
import { FirebaseAuthGuard } from '../../../modules/firebase/firebase-auth.guard';

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

  @UseGuards(FirebaseAuthGuard)
  @Get('/profile')
  getProfile(@Req() req) {
    const currentUser = req.user;
    return this.authService.getProfile(currentUser);
  }

  @Post('/register')
  @HttpCode(200)
  @ApiOperation({ summary: 'Register user' })
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiBody({
    type: SendAuthRegister,
    description: 'Register dto',
  })
  register(
    @Body()
    requestService: SendAuthRegister,
  ) {
    try {
      return this.authService.register(requestService);
    } catch (error) {
      executeError(error);
    }
  }

  @Post('/create-admin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Register user AMDIN' })
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiBody({
    type: SendAuthRegister,
    description: 'Register dto',
  })
  createAdmin(
    @Body()
    requestService: SendAuthRegister,
  ) {
    try {
      return this.authService.register({ ...requestService, isAdmin: true });
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Put('/set-role')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update Role' })
  @ApiResponse({ status: 200, description: 'OK' })
  @ApiBody({
    type: SendSetRole,
    description: 'Register dto',
  })
  setRole(
    @Req() req,
    @Body()
    requestService: SendSetRole,
  ) {
    try {
      const currentUser = req.user;
      return this.authService.setRole({ ...requestService, currentUser });
    } catch (error) {
      executeError(error);
    }
  }
}
