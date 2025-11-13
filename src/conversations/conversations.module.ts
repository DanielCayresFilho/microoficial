import { Module, forwardRef } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    PrismaModule,
    WhatsAppModule,
    forwardRef(() => EventsModule), // forwardRef para evitar dependência circular
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
