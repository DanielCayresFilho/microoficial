import { IsString, IsNotEmpty, IsEmail, IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateOperatorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxConcurrent?: number;
}
