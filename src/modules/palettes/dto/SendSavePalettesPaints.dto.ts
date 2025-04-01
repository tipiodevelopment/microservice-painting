import { IsDefined, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendSavePalettesPaints {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  paint_id: string;

  @IsOptional()
  @IsString()
  image_color_picks_id?: string;
}
