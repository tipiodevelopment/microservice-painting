import { IsDefined, IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class SendAuthRegister {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsDefined()
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  email: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  password: string;
}
