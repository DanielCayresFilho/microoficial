import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { Public } from '../auth/public.decorator';

@Controller('webhooks/whatsapp')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * Webhook verification (GET) - Meta requires this for webhook setup
   */
  @Public()
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    this.logger.log(`Webhook verification request: mode=${mode}, token=${token}`);

    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      this.logger.log('Webhook verified successfully');
      return challenge;
    }

    this.logger.warn('Webhook verification failed');
    return 'Verification failed';
  }

  /**
   * Webhook receiver (POST) - Receives all WhatsApp events
   * IMPORTANT: This must respond quickly (< 200ms) or Meta will retry
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(@Body() body: any) {
    this.logger.debug(`Received webhook: ${JSON.stringify(body)}`);

    // Immediately acknowledge receipt to Meta
    // Process asynchronously in background
    setImmediate(async () => {
      try {
        await this.webhooksService.processWebhookEvent(body);
      } catch (error) {
        this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
      }
    });

    return { status: 'received' };
  }
}
