import { IsDefined, IsString, IsNotEmpty, IsUrl } from 'class-validator';

export class SendUpdateImage {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  @IsUrl()
  image_path: string;
}
