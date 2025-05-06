import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  Param,
  ParseBoolPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { FlagsService } from '../providers/flags.service';
import { executeError } from '../../../utils/error';

@ApiTags('Flags')
@Controller('flags')
export class FlagsController {
  constructor(private readonly _flagsService: FlagsService) {}

  @Get('/health-check')
  @HttpCode(200)
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'OK' })
  async HealthCheck() {
    try {
      return this._flagsService.healthCheck();
    } catch (error) {
      executeError(error);
    }
  }

  @Get('/guest-logic')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get guest logic' })
  @ApiResponse({ status: 200, description: 'OK' })
  async GetGuestLogic() {
    try {
      return this._flagsService.GetGuestLogic();
    } catch (error) {
      executeError(error);
    }
  }

  @Post('/guest-logic/:value')
  @HttpCode(200)
  @ApiOperation({ summary: 'Set guest logic' })
  @ApiResponse({ status: 200, description: 'OK' })
  async SetGuestLogicActive(
    @Param('value', new DefaultValuePipe(true), ParseBoolPipe) value: boolean,
  ) {
    try {
      return this._flagsService.SetGuestLogic(value);
    } catch (error) {
      executeError(error);
    }
  }
}
