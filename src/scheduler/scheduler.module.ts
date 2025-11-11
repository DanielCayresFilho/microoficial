import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OperatorsModule } from '../operators/operators.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, OperatorsModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
