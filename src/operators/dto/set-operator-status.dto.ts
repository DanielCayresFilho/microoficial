import {
  IsArray,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class SetOperatorStatusDto {
  @IsString()
  @IsOptional()
  connectedUrl?: string;

  @IsString()
  @IsOptional()
  queueKey?: string;

  @IsString()
  @IsOptional()
  numberId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  segments?: string[];

  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxConcurrent?: number;
}

