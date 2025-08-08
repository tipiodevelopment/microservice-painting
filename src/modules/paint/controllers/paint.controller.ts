import {
  Controller,
  Get,
  HttpCode,
  Post,
  Delete,
  Put,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  Patch,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { PaintService } from '../providers/paint.service';
import { executeError } from '../../../utils/error';
import { SendCreatePaint } from '../dto/SendCreatePaint.dto';
import { SendUpdatePaint } from '../dto/SendUpdatePaint.dto';
import { FirebaseAuthGuard } from 'src/modules/firebase/firebase-auth.guard';
import { PendingPaintSubmissionDto } from '../dto/PendingPaintSubmission.dto';
import { SendAddTag } from '../dto/SendAddTag';
import { SendUpdateTag } from '../dto/SendUpdateTag';

@ApiTags('PAINT')
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

  /**
   * GET /paint
   * Retrieves paints across all brands (or filtered by brandId) with optional filters.
   */
  @Get('/')
  @ApiOperation({
    summary: 'Get all paints (optionally filtered)',
    description:
      'Filters: brandId, name, code, hex. Supports pagination via limit & page.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated paint data',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Optional category to filter paints',
    example: 'category',
  })
  @ApiQuery({
    name: 'brandId',
    required: false,
    description: 'Optional brand ID to filter paints',
    example: 'brand123',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Partial or full name of paint (case-insensitive)',
    example: 'ultramarine',
  })
  @ApiQuery({
    name: 'code',
    required: false,
    description: 'Paint code filter',
    example: 'C-1234',
  })
  @ApiQuery({
    name: 'hex',
    required: false,
    description: 'Hex color filter (e.g. #FFF000)',
    example: '#ABCDEF',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (for pagination)',
    example: 1,
  })
  getAllPaints(
    @Query('category') category?: string,
    @Query('brandId') brandId?: string,
    @Query('name') name?: string,
    @Query('code') code?: string,
    @Query('hex') hex?: string,
    @Query('limit') limit = 10,
    @Query('page') page?: number,
    @Query('sort') sort?: 'asc' | 'desc',
  ) {
    try {
      return this._paintService.getAllPaints(
        { name, code, hex, brandId, category },
        Number(limit),
        page,
        sort,
      );
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('/paint-info/:brandId/:paintId')
  @HttpCode(200)
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without Firebase tokens (NOT for production).',
  })
  @ApiParam({
    name: 'brandId',
    description: 'Paint brand ID',
    example: 'Arteza',
  })
  @ApiParam({
    name: 'paintId',
    description: 'paint ID',
    example: 'A001',
  })
  async getPaintInfo(
    @Req() req,
    @Param('brandId') brandId: string,
    @Param('paintId') paintId: string,
  ) {
    try {
      const currentUser = req.user;
      return await this._paintService.getPaintUsageInfo(
        currentUser.uid,
        brandId,
        paintId,
      );
    } catch (error) {
      executeError(error);
    }
  }

  @Get('/pending-paint-submissions')
  @HttpCode(200)
  @ApiOperation({
    summary: 'List paint submissions, optional filter by status',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'finalized'] })
  @ApiResponse({
    status: 200,
    description: 'List of paint submissions retrieved',
  })
  list(@Query('status') status?: 'pending' | 'finalized') {
    return this._paintService.listSubmissions(status);
  }

  /**
   * GET /paint/closest-by-brands
   * Finds the closest paint colors across multiple brands by comparing to a target hex color.
   */
  @Get('/closest-by-brands')
  @ApiOperation({
    summary:
      'Get closest paints by hex color across multiple brands (paginated)',
  })
  @ApiResponse({
    status: 200,
    description: 'Closest paints from multiple brands',
  })
  @ApiQuery({
    name: 'hex',
    required: true,
    description: 'Base hex color to compare, e.g. #FFFFFF',
    example: '#FFFFFF',
  })
  @ApiQuery({
    name: 'brandIds',
    required: true,
    description: 'Comma-separated brand IDs, e.g. brand1,brand2',
    example: 'brand1,brand2,brand3',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (for pagination)',
    example: 1,
  })
  getClosestPaintsFromBrands(
    @Query('hex') hex: string,
    @Query('brandIds') brandIdsRaw: string,
    @Query('limit') limit = 10,
    @Query('page') page = 1,
  ) {
    try {
      if (!hex) throw new Error('Hex color is required');
      if (!brandIdsRaw) throw new Error('brandIds are required');

      const brandIds = brandIdsRaw
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

      return this._paintService.findClosestPaintsAcrossBrands(
        brandIds,
        hex,
        Number(limit),
        Number(page),
      );
    } catch (error) {
      executeError(error);
    }
  }

  /**
   * GET /paint/category
   * Find all categories
   */
  @Get('/category')
  @ApiOperation({
    summary: 'Get all categories',
  })
  @ApiResponse({
    status: 200,
    description: 'Get all categories',
  })
  getCategories() {
    try {
      return this._paintService.getCategories();
    } catch (error) {
      executeError(error);
    }
  }

  /**
   * GET /paint/:brandId
   * Retrieves paints from a specific brand with optional filters.
   */
  @Get('/:brandId')
  @ApiOperation({
    summary: 'Get paints from a specific brand (optionally filtered)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated paints for the specified brand',
  })
  @ApiParam({
    name: 'brandId',
    description: 'Brand ID to retrieve paints from',
    example: 'brand123',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Partial or full name of paint (case-insensitive)',
    example: 'ultramarine',
  })
  @ApiQuery({
    name: 'code',
    required: false,
    description: 'Paint code filter',
    example: 'C-1234',
  })
  @ApiQuery({
    name: 'hex',
    required: false,
    description: 'Hex color filter (e.g. #ABCDEF)',
    example: '#ABCDEF',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (for pagination)',
    example: 1,
  })
  getPaints(
    @Param('brandId') brandId: string,
    @Query('name') name?: string,
    @Query('code') code?: string,
    @Query('hex') hex?: string,
    @Query('limit') limit = 10,
    @Query('page') page?: number,
  ) {
    try {
      return this._paintService.getPaints(
        brandId,
        { name, code, hex },
        Number(limit),
        page,
      );
    } catch (error) {
      executeError(error);
    }
  }

  /**
   * POST /paint
   * Creates a new paint in the specified brand.
   */
  @Post('/')
  @HttpCode(200)
  @ApiOperation({ summary: 'Create a new paint' })
  @ApiResponse({ status: 200, description: 'Paint created successfully' })
  @ApiBody({
    type: SendCreatePaint,
    description: 'Payload for creating a paint',
  })
  createPaint(@Body() requestService: SendCreatePaint) {
    try {
      return this._paintService.createPaint(requestService);
    } catch (error) {
      executeError(error);
    }
  }

  /**
   * DELETE /paint/:brandId/:paintId
   * Deletes a paint by brandId and paintId.
   */
  @Delete('/:brandId/:paintId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a paint' })
  @ApiResponse({ status: 200, description: 'Paint deleted successfully' })
  @ApiParam({
    name: 'brandId',
    description: 'Brand ID containing the paint',
    example: 'brand123',
  })
  @ApiParam({
    name: 'paintId',
    description: 'Unique ID of the paint to delete',
    example: 'paint987',
  })
  deletePaint(
    @Param('brandId') brandId: string,
    @Param('paintId') paintId: string,
  ) {
    try {
      return this._paintService.deletePaint(brandId, paintId);
    } catch (error) {
      executeError(error);
    }
  }

  /**
   * PUT /paint/:brandId/:paintId
   * Updates an existing paint.
   */
  @Put('/:brandId/:paintId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update a paint' })
  @ApiResponse({ status: 200, description: 'Paint updated successfully' })
  @ApiParam({
    name: 'brandId',
    description: 'Brand ID containing the paint',
    example: 'brand123',
  })
  @ApiParam({
    name: 'paintId',
    description: 'Unique ID of the paint to update',
    example: 'paint987',
  })
  @ApiBody({
    type: SendUpdatePaint,
    description: 'Payload for updating paint fields (all optional)',
  })
  updatePaint(
    @Param('brandId') brandId: string,
    @Param('paintId') paintId: string,
    @Body() requestService: SendUpdatePaint,
  ) {
    try {
      return this._paintService.updatePaint(brandId, paintId, requestService);
    } catch (error) {
      executeError(error);
    }
  }

  @Patch('/pending-paint-submissions/:id')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Update a pending paint submission (fields or status)',
  })
  @ApiParam({ name: 'id', description: 'Submission document ID' })
  @ApiBody({
    type: PendingPaintSubmissionDto,
    description: 'Payload for updating a pending paint submission',
  })
  @ApiResponse({ status: 200, description: 'Submission updated successfully' })
  update(@Param('id') id: string, @Body() dto: PendingPaintSubmissionDto) {
    return this._paintService.updateSubmission(id, dto);
  }

  /**
   * POST /paint/update-name-lower
   * (No body) Updates name_lower for all paints in the database.
   */
  @Post('update-name-lower')
  @ApiOperation({
    summary: 'Bulk update: sets name_lower for all paints in DB',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a success message after updating all paints',
  })
  async updateNameLower() {
    try {
      return await this._paintService.updateNameLowerForAllPaints();
    } catch (error) {
      executeError(error);
    }
  }

  @Get('/barcode/duplicates')
  getRepeatedBarcodes() {
    try {
      return this._paintService.getRepeatedBarcodes();
    } catch (error) {
      executeError(error);
    }
  }

  /**
   * GET /paint/barcode/{barcode}
   * Find the paints with specific barcode
   */
  // @UseGuards(FirebaseAuthGuard)
  @Get('/barcode/:barcode')
  getByBarcode(@Req() req, @Param('barcode') barcode: string) {
    try {
      const currentUser = req.user ?? '';
      return this._paintService.getByBarcode(currentUser.uid, barcode);
    } catch (error) {
      executeError(error);
    }
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('/paint-status/:brand/:paintId')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get paint status for user in palette context',
    description:
      'Checks if a given paint (specified by paintId) from a brand (provided as ID or name) is present in the user’s inventory and wishlist.',
  })
  @ApiHeader({
    name: 'x-user-uid',
    required: false,
    description:
      'Optional UID for local testing without Firebase tokens (NOT for production).',
  })
  @ApiParam({
    name: 'brand',
    description: 'Brand identifier (can be ID or brand name)',
    example: 'Arteza',
  })
  @ApiParam({
    name: 'paintId',
    description: 'Identifier of the paint',
    example: 'A001',
  })
  async getPaintStatus(
    @Req() req,
    @Param('brand') brand: string,
    @Param('paintId') paintId: string,
  ) {
    try {
      const currentUser = req.user;
      return await this._paintService.getPaintStatus(
        currentUser.uid,
        brand,
        paintId,
      );
    } catch (error) {
      executeError(error);
    }
  }

  /**
   * GET /process/category/add-or-update
   * This process add the category field to all paints
   */
  @Get('/process/category/add-or-update')
  processCategoryPaints() {
    try {
      return this._paintService.processCategoryPaints();
    } catch (error) {
      executeError(error);
    }
  }

  /**
   * GET /process/category/create
   */
  @Get('/process/category/create')
  processCategoryCreate() {
    try {
      return this._paintService.processCategoryCreate();
    } catch (error) {
      executeError(error);
    }
  }

  @Post('/pending-paint-submissions')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Create a paint submission (status defaults to pending)',
  })
  @ApiBody({
    type: PendingPaintSubmissionDto,
    description: 'Payload for creating or updating a pending paint submission',
  })
  @ApiResponse({ status: 200, description: 'Submission created successfully' })
  create(@Body() dto: PendingPaintSubmissionDto) {
    return this._paintService.createSubmission(dto);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('/user/tags')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Add tag to paint',
  })
  @ApiBody({
    type: SendAddTag,
    description: 'Payload for add tag to a paint',
  })
  @ApiResponse({ status: 200, description: 'Add Tag successfully' })
  addTag(@Req() req, @Body() dto: SendAddTag) {
    const currentUser = req.user;
    console.log('currentUser', currentUser);
    return this._paintService.addTag({ ...dto, userId: currentUser.uid });
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('/user/tags/admin')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Add tag to paint as Admin',
  })
  @ApiBody({
    type: SendAddTag,
    description: 'Payload for add tag to a paint',
  })
  @ApiResponse({ status: 200, description: 'Add Tag successfully' })
  addTagAdmin(@Req() req, @Body() dto: SendAddTag) {
    const currentUser = req.user;
    return this._paintService.addTagAdmin({ ...dto, userId: currentUser.uid });
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('/user/tags/:brandId/:paintId')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get tags from a paint',
  })
  @ApiResponse({ status: 200, description: 'Get Tags successfully' })
  getTags(
    @Req() req,
    @Param('brandId') brandId: string,
    @Param('paintId') paintId: string,
  ) {
    const currentUser = req.user;
    return this._paintService.getTags(currentUser.uid, brandId, paintId);
  }

  @UseGuards(FirebaseAuthGuard)
  @Put('/user/tags/:tagId')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Update tag from a paint',
  })
  @ApiResponse({ status: 200, description: 'Update Tag successfully' })
  updateTag(
    @Req() req,
    @Param('tagId') tagId: string,
    @Body()
    body: SendUpdateTag,
  ) {
    const currentUser = req.user;
    return this._paintService.updateTag(currentUser.uid, tagId, body.tag);
  }

  @UseGuards(FirebaseAuthGuard)
  @Delete('/user/tags/:tagId')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Update tag from a paint',
  })
  @ApiResponse({ status: 200, description: 'Update Tag successfully' })
  deleteTag(@Req() req, @Param('tagId') tagId: string) {
    const currentUser = req.user;
    return this._paintService.deleteTag(currentUser.uid, tagId);
  }
}
