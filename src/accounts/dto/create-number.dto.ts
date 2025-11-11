import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateNumberDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  qualityRating?: string;

  @IsString()
  @IsOptional()
  verifiedName?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
