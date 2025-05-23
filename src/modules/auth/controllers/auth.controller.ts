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
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiHeader,
} from '@nestjs/swagger';
import { AuthService } from '../providers/auth.service';
import { executeError } from '../../../utils/error';
import { SendAuthRegister } from '../dtos/SendAuthRegister.dto';
import { SendSetRole } from '../dtos/SendSetRole.dto';
import { FirebaseAuthGuard } from '../../../modules/firebase/firebase-auth.guard';
import { SendAuthCreateUser } from '../dtos/SendAuthCreateUser.dto';
import { SendSaveToken } from '../dtos/SendSaveToken.dto';

@ApiTags('AUTH')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * GET /auth/health-check
   * A simple health check.
   */
  @Get('/health-check')
  @HttpCode(200)
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'OK' })
  HealthCheck() {
    try {
      return this.authService.healthCheck();
    } catch (error) {
      console.error('ERROR Get health-check ', error);
      return { status: 'error' };
    }
  }

  /**
   * GET /auth/profile
   * Retrieve the current user's profile from Firestore.
   * This endpoint is protected by FirebaseAuthGuard.
   */
  @UseGuards(FirebaseAuthGuard)
  @Get('/profile')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without Firebase tokens (NOT for production).',
  })
  getProfile(@Req() req) {
    try {
      const currentUser = req.user;
      return this.authService.getProfile(currentUser);
    } catch (error) {
      executeError(error);
    }
  }

  /**
   * POST /auth/register
   * Registers a new user with email/password and stores user data in Firestore.
   */
  @Post('/register')
  @HttpCode(200)
  @ApiOperation({ summary: 'Register user (with email & password)' })
  @ApiResponse({ status: 200, description: 'User registered successfully' })
  @ApiBody({
    type: SendAuthRegister,
    description: 'DTO for user registration (email, password, username)',
  })
  register(@Body() requestService: SendAuthRegister) {
    try {
      return this.authService.register(requestService);
    } catch (error) {
      executeError(error);
    }
  }

  /**
   * POST /auth/create-user
   * Creates a user record (FireStore) for an existing Firebase user
   * (assumes you already have their UID).
   */
  @Post('/create-user')
  @HttpCode(200)
  @ApiOperation({ summary: 'Only create user row (FireStore)' })
  @ApiResponse({ status: 200, description: 'User record created' })
  @ApiBody({
    type: SendAuthCreateUser,
    description: 'Creates a user document with uid, email, name',
  })
  createUser(@Body() requestService: SendAuthCreateUser) {
    try {
      return this.authService.createUser(requestService);
    } catch (error) {
      executeError(error);
    }
  }

  /**
   * POST /auth/create-admin
   * Registers a new user as an ADMIN (isAdmin: true).
   */
  @Post('/create-admin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Register user as ADMIN' })
  @ApiResponse({ status: 200, description: 'Admin user registered' })
  @ApiBody({
    type: SendAuthRegister,
    description: 'DTO for admin user registration',
  })
  createAdmin(@Body() requestService: SendAuthRegister) {
    try {
      return this.authService.register({ ...requestService, isAdmin: true });
    } catch (error) {
      executeError(error);
    }
  }

  /**
   * PUT /auth/set-role
   * Updates a user's role (requires current user to be ADMIN).
   */
  @UseGuards(FirebaseAuthGuard)
  @Put('/set-role')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update user role (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without Firebase tokens (NOT for production).',
  })
  @ApiBody({
    type: SendSetRole,
    description: 'DTO with new role and email of target user',
  })
  setRole(@Req() req, @Body() requestService: SendSetRole) {
    try {
      const currentUser = req.user;
      return this.authService.setRole({ ...requestService, currentUser });
    } catch (error) {
      executeError(error);
    }
  }

  @Post('/save-token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Save FCM token for the current user' })
  @ApiResponse({ status: 200, description: 'FCM token saved successfully' })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without Firebase tokens (NOT for production).',
  })
  @UseGuards(FirebaseAuthGuard)
  async saveToken(@Req() req, @Body() requestService: SendSaveToken) {
    try {
      const currentUser = req.user;
      return this.authService.saveToken(currentUser.uid, requestService.token);
    } catch (error) {
      executeError(error);
    }
  }
}
