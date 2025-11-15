import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('operators')
  @HttpCode(HttpStatus.OK)
  getOperatorsReport(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('operatorId') operatorId?: string,
  ) {
    return this.reportsService.getOperatorsReport({
      dateFrom,
      dateTo,
      operatorId,
    });
  }

  @Get('conversations')
  @HttpCode(HttpStatus.OK)
  getConversationsReport(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('operatorId') operatorId?: string,
    @Query('status') status?: string,
    @Query('tabulationId') tabulationId?: string,
  ) {
    return this.reportsService.getConversationsReport({
      dateFrom,
      dateTo,
      operatorId,
      status,
      tabulationId,
    });
  }

  @Get('operators/productivity')
  @HttpCode(HttpStatus.OK)
  getOperatorProductivity(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reportsService.getOperatorProductivity({
      dateFrom,
      dateTo,
    });
  }

  @Get('conversations/by-period')
  @HttpCode(HttpStatus.OK)
  getConversationsByPeriod(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
  ) {
    return this.reportsService.getConversationsByPeriod({
      dateFrom,
      dateTo,
      groupBy: groupBy || 'day',
    });
  }

  @Get('conversations/by-tabulation')
  @HttpCode(HttpStatus.OK)
  getConversationsByTabulation(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.reportsService.getConversationsByTabulation({
      dateFrom,
      dateTo,
    });
  }
}

