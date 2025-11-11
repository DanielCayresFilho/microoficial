import { Module, forwardRef } from '@nestjs/common';
import { CampaignMessagesProcessor } from './campaign-messages.processor';
import { IncomingMessagesProcessor } from './incoming-messages.processor';
import { MessageStatusProcessor } from './message-status.processor';
import { PrismaModule } from '../../prisma/prisma.module';
import { WhatsAppModule } from '../../whatsapp/whatsapp.module';
import { EventsModule } from '../../events/events.module';

@Module({
  imports: [PrismaModule, WhatsAppModule, forwardRef(() => EventsModule)],
  providers: [
    CampaignMessagesProcessor,
    IncomingMessagesProcessor,
    MessageStatusProcessor,
  ],
})
export class ProcessorsModule {}
