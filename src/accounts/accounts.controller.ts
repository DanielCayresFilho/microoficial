import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateNumberDto } from './dto/create-number.dto';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createAccount(@Body() dto: CreateAccountDto) {
    return this.accountsService.createAccount(dto);
  }

  @Get()
  findAllAccounts() {
    return this.accountsService.findAllAccounts();
  }

  @Get(':id')
  findAccountById(@Param('id') id: string) {
    return this.accountsService.findAccountById(id);
  }

  @Put(':id')
  updateAccount(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.accountsService.updateAccount(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAccount(@Param('id') id: string) {
    return this.accountsService.deleteAccount(id);
  }

  @Post(':id/numbers')
  @HttpCode(HttpStatus.CREATED)
  addNumber(@Param('id') accountId: string, @Body() dto: CreateNumberDto) {
    return this.accountsService.addNumber(accountId, dto);
  }

  @Get(':id/numbers')
  findNumbersByAccount(@Param('id') accountId: string) {
    return this.accountsService.findNumbersByAccount(accountId);
  }

  @Put(':id/numbers/:numberId')
  updateNumber(
    @Param('id') accountId: string,
    @Param('numberId') numberId: string,
    @Body() dto: Partial<CreateNumberDto>,
  ) {
    return this.accountsService.updateNumber(accountId, numberId, dto);
  }

  @Delete(':id/numbers/:numberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteNumber(
    @Param('id') accountId: string,
    @Param('numberId') numberId: string,
  ) {
    return this.accountsService.deleteNumber(accountId, numberId);
  }
}
