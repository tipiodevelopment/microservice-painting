import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiHeader,
  ApiBody,
} from '@nestjs/swagger';
import { ColorSearchesService } from '../providers/color-searches.service';
import { executeError } from '../../../utils/error';
import { FirebaseAuthGuard } from '../../../modules/firebase/firebase-auth.guard';

@ApiTags('Color Searches')
@Controller('color-searches')
export class ColorSearchesController {
  constructor(private readonly _colorSearchesService: ColorSearchesService) {}

  @Get('/health-check')
  @HttpCode(200)
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'OK' })
  async HealthCheck() {
    try {
      return this._colorSearchesService.healthCheck();
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('/')
  @HttpCode(201)
  @ApiOperation({ summary: 'Save a color search' })
  @ApiResponse({
    status: 201,
    description: 'Color search saved successfully.',
  })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without a Firebase token (NOT for production).',
  })
  @ApiBody({
    description: 'Body containing an array of paints (paint_id, brand_id)',
    schema: {
      type: 'object',
      properties: {
        paints: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              paint_id: { type: 'string', example: 'paint123' },
              brand_id: { type: 'string', example: 'brand456' },
            },
            required: ['paint_id', 'brand_id'],
          },
        },
      },
      required: ['paints'],
    },
  })
  async saveColorSearch(
    @Req() req,
    @Body()
    body: {
      paints: { paint_id: string; brand_id: string }[];
    },
  ) {
    try {
      const currentUser = req.user;
      return this._colorSearchesService.saveColorSearch(
        currentUser.uid,
        body.paints,
      );
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('/')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get user color searches' })
  @ApiResponse({
    status: 200,
    description: 'Returns the user’s color searches with paint/brand data',
  })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without a Firebase token (NOT for production).',
  })
  async getUserColorSearches(@Req() req) {
    try {
      const currentUser = req.user;
      return this._colorSearchesService.getUserColorSearches(currentUser.uid);
    } catch (error) {
      executeError(error);
    }
  }
}
