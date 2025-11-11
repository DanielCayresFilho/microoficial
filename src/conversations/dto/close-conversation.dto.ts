import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CloseConversationDto {
  @IsString()
  @IsNotEmpty()
  tabulationId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
