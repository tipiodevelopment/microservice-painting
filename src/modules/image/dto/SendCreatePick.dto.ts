import {
  IsDefined,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDecimal,
} from 'class-validator';

export class SendCreatePick {
  @IsDefined()
  @IsNumber()
  index: number;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  hex_color: string;

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
  @IsDecimal()
  x_coord: number;

  @IsDefined()
  @IsDecimal()
  y_coord: number;
}
