// src/email/email.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmailService } from '../providers/email.service';
import { NewsletterDto } from '../dto/newsletter.dto.ts';
import { SendWelcomeDto } from '../dto/send-welcome.dto';

@ApiTags('EMAIL')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get('health-check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Email microservice health check' })
  @ApiResponse({ status: 200, description: 'OK' })
  healthCheck() {
    return this.emailService.healthCheck();
  }

  @Post('newsletter')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send newsletter to all users' })
  @ApiResponse({
    status: 202,
    description: 'Newsletter has been queued for delivery',
  })
  async sendNewsletter(@Body() dto: NewsletterDto) {
    await this.emailService.sendNewsletter(dto.subject, dto.text);
    return { message: 'Newsletter delivery started' };
  }

  @Post('welcome')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send a welcome email to one user' })
  @ApiResponse({
    status: 202,
    description: 'Welcome email has been queued for delivery',
  })
  async sendWelcome(@Body() dto: SendWelcomeDto) {
    await this.emailService.sendWelcomeEmail(dto.email, dto.name);
    return { message: 'Welcome email queued' };
  }
}
