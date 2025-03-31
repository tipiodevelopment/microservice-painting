import { IsDefined, IsString, IsNotEmpty } from 'class-validator';

export class SendSavePalettes {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  name: string;
}
