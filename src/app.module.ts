import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { QueuesModule } from './queues/queues.module';
import { ProcessorsModule } from './queues/processors/processors.module';
import { EventsModule } from './events/events.module';
import { AuthModule } from './auth/auth.module';
import { ApiKeyGuard } from './auth/api-key.guard';
import { AccountsModule } from './accounts/accounts.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ConversationsModule } from './conversations/conversations.module';
import { TabulationsModule } from './tabulations/tabulations.module';
import { OperatorsModule } from './operators/operators.module';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    WhatsAppModule,
    QueuesModule,
    ProcessorsModule,
    EventsModule,
    AuthModule,
    AccountsModule,
    CampaignsModule,
    WebhooksModule,
    ConversationsModule,
    TabulationsModule,
    OperatorsModule,
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule {}
