import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  businessId: string;

  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
