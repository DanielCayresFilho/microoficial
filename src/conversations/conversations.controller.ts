import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CloseConversationDto } from './dto/close-conversation.dto';
import { SetCpcStatusDto } from './dto/set-cpc-status.dto';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  findAllConversations(
    @Query('status') status?: string,
    @Query('operatorId') operatorId?: string,
  ) {
    return this.conversationsService.findAllConversations(status, operatorId);
  }

  @Get('stats')
  getConversationStats() {
    return this.conversationsService.getConversationStats();
  }

  @Get(':id')
  findConversationById(@Param('id') id: string) {
    return this.conversationsService.findConversationById(id);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  sendMessage(@Param('id') conversationId: string, @Body() dto: SendMessageDto) {
    return this.conversationsService.sendMessage(conversationId, dto);
  }

  @Get(':id/eligibility')
  getEligibility(@Param('id') conversationId: string) {
    return this.conversationsService.getConversationEligibility(conversationId);
  }

  @Post(':id/cpc')
  @HttpCode(HttpStatus.OK)
  setCpcStatus(
    @Param('id') conversationId: string,
    @Body() dto: SetCpcStatusDto,
  ) {
    return this.conversationsService.setCpcStatus(conversationId, dto);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  closeConversation(
    @Param('id') conversationId: string,
    @Body() dto: CloseConversationDto,
  ) {
    return this.conversationsService.closeConversation(conversationId, dto);
  }

  @Put(':id/assign')
  assignOperator(
    @Param('id') conversationId: string,
    @Body('operatorId') operatorId: string,
  ) {
    return this.conversationsService.assignOperator(conversationId, operatorId);
  }
}
