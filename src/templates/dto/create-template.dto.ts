import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  language: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  templateId?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsObject()
  @IsOptional()
  components?: Record<string, any>;

  @IsArray()
  @IsOptional()
  variables?: string[];

  @IsString()
  @IsOptional()
  numberId?: string;
}

