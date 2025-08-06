import {
  IsDefined,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
} from 'class-validator';

export class SendAddItem {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  project_id: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  @IsIn(['palettes', 'user_color_images', 'paints'])
  table: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  table_id: string;

  //Only used where table is paint
  @IsOptional()
  @IsString()
  brand_id: string;
}
