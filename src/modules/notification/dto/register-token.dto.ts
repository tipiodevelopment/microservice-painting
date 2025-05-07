// src/notification/dto/register-token.dto.ts

import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterTokenDto {
  @ApiProperty({ description: 'ID of the user in Firestore' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({ description: 'FCM token obtained from the client' })
  @IsNotEmpty()
  @IsString()
  token: string;
}
