import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsArray,
  IsOptional,
  IsIn,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  body: string;

  @ApiProperty({ description: 'Route or deep-link to navigate to' })
  @IsOptional()
  @IsString()
  targetRoute?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsNotEmpty()
  @IsString()
  sendAt: string; // ISO date string (initial scheduled send)

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isSent?: boolean;

  @ApiProperty()
  @IsString()
  recipientId: string;

  @ApiProperty({ type: [String], example: ['web', 'mobile'] })
  @IsArray()
  @IsIn(['web', 'mobile'], { each: true })
  platforms: string[];

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiProperty({
    required: false,
    enum: ['low', 'normal', 'high'],
    default: 'high',
  })
  @IsOptional()
  @IsIn(['low', 'normal', 'high'])
  priority?: 'low' | 'normal' | 'high';

  @ApiProperty({
    required: false,
    description: 'If true, send to all users',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  broadcast?: boolean;

  @ApiProperty({ required: false, description: 'List of user IDs to target' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];
}
