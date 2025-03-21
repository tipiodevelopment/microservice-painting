import {
  IsDefined,
  IsString,
  IsNotEmpty,
  IsEmail,
  IsEnum,
} from 'class-validator';
import { roles } from '../../../utils/enums/roles.enum';

export class SendSetRole {
  @IsDefined()
  @IsNotEmpty()
  @IsEnum(roles)
  role: roles;

  @IsDefined()
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  email: string;
}
