import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsBoolean()
  @IsOptional()
  previewUrl?: boolean;
}
