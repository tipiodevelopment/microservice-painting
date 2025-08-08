import { IsString, IsDefined } from 'class-validator';

export class SendUpdateTag {
  @IsDefined()
  @IsString()
  tag: string;
}
