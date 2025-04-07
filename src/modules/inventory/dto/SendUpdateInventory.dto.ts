import { IsString, IsNumber, IsOptional } from 'class-validator';

export class SendUpdateInventory {
  @IsOptional()
  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  notes: string;
}
