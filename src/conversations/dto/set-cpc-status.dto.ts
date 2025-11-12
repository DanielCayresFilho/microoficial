import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SetCpcStatusDto {
  @IsBoolean()
  value: boolean;

  @IsString()
  @IsOptional()
  operatorId?: string;
}

