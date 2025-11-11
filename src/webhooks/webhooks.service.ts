import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_NAMES, JOB_NAMES } from '../queues/queue.constants';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.INCOMING_MESSAGES) private incomingQueue: Queue,
    @InjectQueue(QUEUE_NAMES.MESSAGE_STATUS) private statusQueue: Queue,
  ) {}

  async processWebhookEvent(body: any): Promise<void> {
    try {
      // Log webhook event for debugging
      await this.prisma.webhookEvent.create({
        data: {
          eventType: body.object || 'unknown',
          payload: body,
          processed: false,
        },
      });

      if (body.object !== 'whatsapp_business_account') {
        this.logger.warn(`Unexpected webhook object type: ${body.object}`);
        return;
      }

      const entries = body.entry || [];

      for (const entry of entries) {
        const changes = entry.changes || [];

        for (const change of changes) {
          if (change.field === 'messages') {
            await this.handleMessagesChange(change.value);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error processing webhook event: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleMessagesChange(value: any): Promise<void> {
    const { metadata, messages, statuses } = value;

    // Process incoming messages
    if (messages && messages.length > 0) {
      for (const message of messages) {
        await this.enqueueIncomingMessage(message, metadata);
      }
    }

    // Process message status updates
    if (statuses && statuses.length > 0) {
      for (const status of statuses) {
        await this.enqueueStatusUpdate(status);
      }
    }
  }

  private async enqueueIncomingMessage(message: any, metadata: any): Promise<void> {
    try {
      const { id, from, timestamp, type } = message;

      // Extract message content based on type
      let content: any = {};

      switch (type) {
        case 'text':
          content = { text: message.text?.body };
          break;
        case 'image':
          content = {
            mediaId: message.image?.id,
            mimeType: message.image?.mime_type,
            caption: message.image?.caption,
          };
          break;
        case 'video':
          content = {
            mediaId: message.video?.id,
            mimeType: message.video?.mime_type,
            caption: message.video?.caption,
          };
          break;
        case 'audio':
          content = {
            mediaId: message.audio?.id,
            mimeType: message.audio?.mime_type,
          };
          break;
        case 'document':
          content = {
            mediaId: message.document?.id,
            filename: message.document?.filename,
            mimeType: message.document?.mime_type,
            caption: message.document?.caption,
          };
          break;
        case 'location':
          content = {
            latitude: message.location?.latitude,
            longitude: message.location?.longitude,
            name: message.location?.name,
            address: message.location?.address,
          };
          break;
        case 'contacts':
          content = { contacts: message.contacts };
          break;
        case 'button':
          content = {
            buttonText: message.button?.text,
            buttonPayload: message.button?.payload,
          };
          break;
        case 'interactive':
          content = {
            interactiveType: message.interactive?.type,
            buttonReply: message.interactive?.button_reply,
            listReply: message.interactive?.list_reply,
          };
          break;
        default:
          content = { raw: message };
      }

      // Add to incoming messages queue
      await this.incomingQueue.add(JOB_NAMES.PROCESS_INCOMING_MESSAGE, {
        messageId: id,
        wamid: id,
        from,
        to: metadata.display_phone_number,
        phoneNumberId: metadata.phone_number_id,
        type,
        content,
        timestamp,
        name: message.contacts?.[0]?.profile?.name,
      });

      this.logger.log(`Enqueued incoming message ${id} from ${from}`);
    } catch (error) {
      this.logger.error(`Error enqueuing incoming message: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async enqueueStatusUpdate(status: any): Promise<void> {
    try {
      const { id, status: messageStatus, timestamp, recipient_id, errors } = status;

      await this.statusQueue.add(JOB_NAMES.UPDATE_MESSAGE_STATUS, {
        messageId: id,
        status: messageStatus,
        timestamp,
        recipientId: recipient_id,
        errorCode: errors?.[0]?.code,
        errorMessage: errors?.[0]?.title,
      });

      this.logger.log(`Enqueued status update for message ${id}: ${messageStatus}`);
    } catch (error) {
      this.logger.error(`Error enqueuing status update: ${error.message}`, error.stack);
      throw error;
    }
  }
}
