import {
  IsDefined,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class SendCreatePaint {
  @IsDefined()
  @IsNumber()
  b: number;

  @IsDefined()
  @IsNumber()
  g: number;

  @IsDefined()
  @IsNumber()
  r: number;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  brandId: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  color: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  hex: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  set: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  barcode?: string;
}
