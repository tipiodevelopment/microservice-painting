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
import { WhiteListService } from '../providers/white-list.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { executeError } from '../../../utils/error';
import { FirebaseAuthGuard } from '../../../modules/firebase/firebase-auth.guard';

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

  @Post('/seed')
  async seedWhitelist(@Body() body: { user_id: string }) {
    try {
      return this._whiteListService.seedWhitelist(body.user_id);
    } catch (error) {
      executeError(error);
    }
  }

  // @UseGuards(FirebaseAuthGuard)
  @Post('/')
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
      const currentUser = req.user || { uid: 'sCTI275R8peTBIDQGYbXciyBNQh2' };
      return this._whiteListService.saveToWhiteList(currentUser.uid, body);
    } catch (error) {
      executeError(error);
    }
  }

  // @UseGuards(FirebaseAuthGuard)
  @Get('/')
  async getUserWhiteList(@Req() req) {
    try {
      const currentUser = req.user || { uid: 'sCTI275R8peTBIDQGYbXciyBNQh2' };

      console.log('miguel', currentUser);

      return this._whiteListService.getUserWhiteList(currentUser.uid);
    } catch (error) {
      executeError(error);
    }
  }

  // @UseGuards(FirebaseAuthGuard)
  @Delete('/:id')
  async deleteItem(@Param('id') id: string, @Req() req) {
    try {
      const currentUser = req.user || { uid: 'sCTI275R8peTBIDQGYbXciyBNQh2' };
      return this._whiteListService.deleteItem(id, currentUser.uid);
    } catch (error) {
      executeError(error);
    }
  }

  // @UseGuards(FirebaseAuthGuard)

  @Patch('/:id')
  async updateItem(
    @Param('id') id: string,
    @Body() body: { type?: string; priority?: number },
    @Req() req,
  ) {
    try {
      const currentUser = req.user || { uid: 'sCTI275R8peTBIDQGYbXciyBNQh2' };
      return this._whiteListService.updateItem(id, currentUser.uid, body);
    } catch (error) {
      executeError(error);
    }
  }
}
