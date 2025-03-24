import { IsDefined, IsString, IsNotEmpty } from 'class-validator';

export class SendAuthSignInWithGoogle {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  idToken: string;
}
