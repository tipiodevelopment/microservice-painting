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
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiHeader,
  ApiBody,
  ApiQuery,
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
  @Get('/search')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get user Wishlist with filters and sorting',
    description:
      'Returns the wishlist for the user, allowing optional text search (by painting or brand name), filtering by priority, brand, and palette, as well as ordering by creation date (created_at) or alphabetically (painting name). Pagination is also supported via the "limit" and "page" parameters.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Wishlist filtered, sorted, and paginated (if parameters provided) successfully.',
  })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without Firebase tokens (NOT for production).',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description:
      'Search term to filter results by painting or brand name (case-insensitive).',
    example: 'blue',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    description: 'Filter items by priority (numeric value).',
    example: 3,
  })
  @ApiQuery({
    name: 'brand_id',
    required: false,
    description: 'Filter items by the brand ID.',
    example: 'Arteza',
  })
  @ApiQuery({
    name: 'palette',
    required: false,
    description:
      'Filter items by the name of the palette associated with the wishlist item.',
    example: 'My Palette',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description:
      'Field to sort the results by. Use "created_at" for creation date or "alphabetical" for alphabetical order (using the painting name).',
    example: 'created_at',
  })
  @ApiQuery({
    name: 'direction',
    required: false,
    description:
      'Sort direction: "asc" for ascending or "desc" for descending.',
    example: 'desc',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of results per page for pagination (optional).',
    example: 10,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination (optional).',
    example: 1,
  })
  async getUserWhiteListByFilters(@Req() req, @Query() query: any) {
    try {
      // Use the user from the request, or a default for testing purposes
      const currentUser = req.user || { uid: 'sCTI275R8peTBIDQGYbXciyBNQh2' };
      const filters = {
        q: query.q,
        priority: query.priority ? Number(query.priority) : undefined,
        brand_id: query.brand_id,
        palette: query.palette,
        sortBy: query.sortBy, // can be 'created_at' or 'alphabetical'
        direction: query.direction, // 'asc' or 'desc'
        limit: query.limit ? Number(query.limit) : undefined,
        page: query.page ? Number(query.page) : undefined,
      };
      return await this._whiteListService.getUserWhiteListByFilters(
        currentUser.uid,
        filters,
      );
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
