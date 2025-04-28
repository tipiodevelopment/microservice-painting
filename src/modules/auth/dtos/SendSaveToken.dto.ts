import { ApiProperty } from '@nestjs/swagger';

export class SendSaveToken {
  @ApiProperty({ description: 'Firebase Cloud Messaging token' })
  token: string;
}
