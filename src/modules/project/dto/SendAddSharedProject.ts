import { IsDefined, IsString, IsNotEmpty } from 'class-validator';

export class SendAddSharedProject {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  project_id: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  user_id: string;
}
