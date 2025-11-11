import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from './queue.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          attempts: configService.get<number>('BULLMQ_DEFAULT_JOB_ATTEMPTS', 3),
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
            count: 1000,
          },
          removeOnFail: {
            age: 86400, // Keep failed jobs for 24 hours
          },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.CAMPAIGN_MESSAGES },
      { name: QUEUE_NAMES.INCOMING_MESSAGES },
      { name: QUEUE_NAMES.OUTBOUND_MESSAGES },
      { name: QUEUE_NAMES.MESSAGE_STATUS },
    ),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
