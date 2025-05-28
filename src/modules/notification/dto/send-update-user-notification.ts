import { ApiProperty } from '@nestjs/swagger';

export class SendUpdateUserNotification {
  @ApiProperty({
    description: 'true = notifications on; false = notifications off',
    example: true,
  })
  activeNotification: boolean;
}
