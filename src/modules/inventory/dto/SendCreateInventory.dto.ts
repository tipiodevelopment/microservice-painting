import { IsDefined, IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class SendCreateInventory {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  brand_id: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  paint_id: string;

  @IsDefined()
  @IsNumber()
  quantity: number;

  @IsDefined()
  @IsString()
  notes: string;
}
