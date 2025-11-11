import { IsArray, IsOptional, IsString } from 'class-validator';

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
}

