import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateTabulationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  requiresNotes?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
