import { IsString, IsDefined } from 'class-validator';

export class SendAddTag {
  @IsDefined()
  @IsString()
  brandId: string;

  @IsDefined()
  @IsString()
  paintId: string;

  @IsDefined()
  @IsString()
  tag: string;
}
