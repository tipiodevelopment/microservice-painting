import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

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
  @IsNotEmpty()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  code?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  color?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  hex?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  set?: string;
}
