import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { OperatorsService } from './operators.service';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { SetOperatorStatusDto } from './dto/set-operator-status.dto';

@Controller('operators')
export class OperatorsController {
  constructor(private readonly operatorsService: OperatorsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateOperatorDto) {
    return this.operatorsService.create(dto);
  }

  @Get()
  findAll(@Query('activeOnly') activeOnly?: string) {
    return this.operatorsService.findAll(activeOnly === 'true');
  }

  @Get('status/online')
  getOnlineOperators(
    @Query('queueKey') queueKey?: string,
    @Query('segment') segment?: string,
    @Query('numberId') numberId?: string,
  ) {
    return this.operatorsService.getOnlineOperators({
      queueKey,
      segment,
      numberId,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.operatorsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateOperatorDto>) {
    return this.operatorsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.operatorsService.remove(id);
  }

  @Post(':id/online')
  setOnline(
    @Param('id') id: string,
    @Body() dto: SetOperatorStatusDto,
  ) {
    return this.operatorsService.setOnline(id, dto);
  }

  @Delete(':id/online')
  @HttpCode(HttpStatus.NO_CONTENT)
  markOffline(@Param('id') id: string) {
    return this.operatorsService.markOffline(id);
  }

  @Post(':id/heartbeat')
  @HttpCode(HttpStatus.NO_CONTENT)
  heartbeat(@Param('id') id: string) {
    return this.operatorsService.heartbeat(id);
  }
}
