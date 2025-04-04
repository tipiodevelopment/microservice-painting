import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
  Delete,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiHeader,
  ApiBody,
} from '@nestjs/swagger';
import { WhiteListService } from '../providers/white-list.service';
import { executeError } from '../../../utils/error';
import { FirebaseAuthGuard } from '../../../modules/firebase/firebase-auth.guard';

@ApiTags('Wishlist')
@Controller('wishlist')
export class WhiteListController {
  constructor(private readonly _whiteListService: WhiteListService) {}

  @Get('/health-check')
  @HttpCode(200)
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'OK' })
  async HealthCheck() {
    try {
      return this._whiteListService.healthCheck();
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('/')
  @ApiOperation({ summary: 'Save an item to the WishList' })
  @ApiResponse({ status: 201, description: 'Item saved successfully' })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without Firebase tokens (NOT for production).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['paint_id', 'brand_id', 'type', 'priority'],
      properties: {
        paint_id: { type: 'string', example: 'paint123' },
        brand_id: { type: 'string', example: 'brand456' },
        type: { type: 'string', example: 'favorite' },
        priority: { type: 'number', example: 0 },
      },
    },
  })
  async saveToWhiteList(
    @Req() req,
    @Body()
    body: {
      paint_id: string;
      brand_id: string;
      type: string;
      priority: number;
    },
  ) {
    try {
      const currentUser = req.user || {
        uid: 'sCTI275R8peTBIDQGYbXciyBNQh2',
      };
      return this._whiteListService.saveToWhiteList(currentUser.uid, body);
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('/')
  @ApiOperation({ summary: 'Get user WishList' })
  @ApiResponse({ status: 200, description: 'Returns user wishlist' })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without Firebase tokens (NOT for production).',
  })
  async getUserWhiteList(@Req() req) {
    try {
      const currentUser = req.user || {
        uid: 'sCTI275R8peTBIDQGYbXciyBNQh2',
      };

      return this._whiteListService.getUserWhiteList(currentUser.uid);
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Delete('/:id')
  @ApiOperation({ summary: 'Delete an item from the WishList' })
  @ApiResponse({ status: 200, description: 'Item deleted successfully' })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without Firebase tokens (NOT for production).',
  })
  async deleteItem(@Param('id') id: string, @Req() req) {
    try {
      const currentUser = req.user || {
        uid: 'sCTI275R8peTBIDQGYbXciyBNQh2',
      };
      return this._whiteListService.deleteItem(id, currentUser.uid);
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Patch('/:id')
  @ApiOperation({ summary: 'Update an item from the WishList' })
  @ApiResponse({ status: 200, description: 'Item updated successfully' })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without Firebase tokens (NOT for production).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', example: 'favorite' },
        priority: { type: 'number', example: 2 },
      },
    },
  })
  async updateItem(
    @Param('id') id: string,
    @Body() body: { type?: string; priority?: number },
    @Req() req,
  ) {
    try {
      const currentUser = req.user || {
        uid: 'sCTI275R8peTBIDQGYbXciyBNQh2',
      };
      return this._whiteListService.updateItem(id, currentUser.uid, body);
    } catch (error) {
      executeError(error);
    }
  }
}
