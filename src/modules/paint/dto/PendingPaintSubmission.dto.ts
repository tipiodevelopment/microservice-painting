import {
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsIn,
} from 'class-validator';

/**
 * DTO for creating or updating a pending paint submission.
 * All paint fields are optional; status defaults to 'pending'.
 */
export class PendingPaintSubmissionDto {
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
  @IsNotEmpty()
  brandId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  color?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  hex?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  set?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  barcode?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'finalized'])
  status?: 'pending' | 'finalized' = 'pending';
}
