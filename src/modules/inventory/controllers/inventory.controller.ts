import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InventoryService } from '../providers/inventory.service';
import { executeError } from '../../../utils/error';
import { FirebaseAuthGuard } from '../../../modules/firebase/firebase-auth.guard';
import { SendCreateInventory } from '../dto/SendCreateInventory.dto';
import { SendUpdateInventory } from '../dto/SendUpdateInventory.dto';

@ApiTags('INVENTORY')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly _inventoryService: InventoryService) {}

  @Get('/health-check')
  @HttpCode(200)
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'OK' })
  async HealthCheck() {
    try {
      return this._inventoryService.healthCheck();
    } catch (error) {
      executeError(error);
    }
  }

  /**
   * POST /inventory
   * Creates a new inventory record.
   */
  @UseGuards(FirebaseAuthGuard)
  @Post('/')
  @HttpCode(200)
  @ApiOperation({ summary: 'Create a new inventory record' })
  @ApiResponse({ status: 200, description: 'Inventory created successfully' })
  @ApiBody({
    type: SendCreateInventory,
    description: 'Payload for creating an inventory record',
  })
  createInventory(@Req() req, @Body() requestService: SendCreateInventory) {
    try {
      const currentUser = req.user;
      return this._inventoryService.createInventory(
        currentUser.uid,
        requestService,
      );
    } catch (error) {
      executeError(error);
    }
  }

  /**
   * PUT /inventory
   * Update an inventory record.
   */
  @UseGuards(FirebaseAuthGuard)
  @Put('/:inventoryId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update an inventory record' })
  @ApiResponse({ status: 200, description: 'Inventory update successfully' })
  @ApiBody({
    type: SendUpdateInventory,
    description: 'Payload for update an inventory record',
  })
  updateInventory(
    @Req() req,
    @Param('inventoryId') inventoryId: string,
    @Body() requestService: SendUpdateInventory,
  ) {
    try {
      const currentUser = req.user;
      return this._inventoryService.updateInventory(
        currentUser.uid,
        inventoryId,
        requestService,
      );
    } catch (error) {
      executeError(error);
    }
  }

  /**
   * DELETE /inventory
   * Delete an inventory.
   */
  @UseGuards(FirebaseAuthGuard)
  @Delete('/:inventoryId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete an inventory' })
  @ApiResponse({ status: 200, description: 'Inventory update successfully' })
  deleteInventory(@Req() req, @Param('inventoryId') inventoryId: string) {
    try {
      const currentUser = req.user;
      return this._inventoryService.deleteInventory(
        currentUser.uid,
        inventoryId,
      );
    } catch (error) {
      executeError(error);
    }
  }

  /**
   * GET /inventory
   * Retrieves inventories by filters
   */
  @UseGuards(FirebaseAuthGuard)
  @Get('/')
  @ApiOperation({
    summary: 'Get all inventories (optionally filtered)',
    description:
      'Filters: brandId, stock. Supports pagination via limit & page.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated inventory data',
  })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without Firebase tokens (NOT for production).',
  })
  @ApiQuery({
    name: 'brand',
    required: false,
    description: 'Brand name',
    example: 'Vallejo',
  })
  @ApiQuery({
    name: 'brandId',
    required: false,
    description: 'Brand ID',
    example: 'Vallejo',
  })
  @ApiQuery({
    name: 'stock',
    required: false,
    description: 'Exact stock',
    example: 5,
  })
  @ApiQuery({
    name: 'onlyInStock',
    required: false,
    description: 'Only items with quantity > 0',
    example: true,
  })
  @ApiQuery({
    name: 'minStock',
    required: false,
    description: 'Minimum stock',
    example: 1,
  })
  @ApiQuery({
    name: 'maxStock',
    required: false,
    description: 'Maximum stock',
    example: 10,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limit',
    example: 10,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page',
    example: 1,
  })
  getInventories(
    @Req() req,
    @Query('brand') brand?: string,
    @Query('brandId') brandId?: string,
    @Query('stock') stock?: number,
    @Query('onlyInStock') onlyInStock?: boolean,
    @Query('minStock') minStock?: number,
    @Query('maxStock') maxStock?: number,
    @Query('limit') limit = 10,
    @Query('page') page: number = 1,
  ) {
    try {
      const currentUser = req.user || {
        uid: 'sCTI275R8peTBIDQGYbXciyBNQh2',
      };
      return this._inventoryService.getInventories(
        currentUser.uid,
        { brand, brandId, stock, onlyInStock, minStock, maxStock },
        Number(limit),
        page,
      );
    } catch (error) {
      executeError(error);
    }
  }
}
