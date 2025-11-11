import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  templateId: string;

  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @IsNotEmpty()
  numberId: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  rateLimit?: number; // Messages per minute

  @IsString()
  @IsOptional()
  queueKey?: string;

  @IsString()
  @IsOptional()
  originUrl?: string;

  @IsString({ each: true })
  @IsOptional()
  segments?: string[];
}
