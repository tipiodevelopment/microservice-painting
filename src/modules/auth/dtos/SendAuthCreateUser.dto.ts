import { IsDefined, IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class SendAuthCreateUser {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  uid: string;

  @IsDefined()
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  email: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  name: string;
}
