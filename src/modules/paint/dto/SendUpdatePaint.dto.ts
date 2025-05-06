import { IsString, IsNumber, IsOptional } from 'class-validator';

export class SendUpdatePaint {
  @IsOptional()
  @IsNumber()
  b?: number;

  @IsOptional()
  @IsNumber()
  g?: number;

  @IsOptional()
  @IsNumber()
  r?: number;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  hex?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  set?: string;

  @IsOptional()
  @IsString()
  barcode?: string;
}
