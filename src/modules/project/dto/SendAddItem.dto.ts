import { IsDefined, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendAddItem {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  project_id: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
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
