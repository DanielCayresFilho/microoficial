import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface SendTemplateMessageDto {
  to: string;
  templateName: string;
  languageCode: string;
  components?: any[];
}

export interface SendTextMessageDto {
  to: string;
  text: string;
  previewUrl?: boolean;
}

export interface SendMediaMessageDto {
  to: string;
  type: 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
  mediaId?: string;
  caption?: string;
  filename?: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiVersion: string;
  private readonly baseUrl: string;
  private axiosInstances: Map<string, AxiosInstance> = new Map();

  constructor(private configService: ConfigService) {
    this.apiVersion = this.configService.get<string>(
      'WHATSAPP_API_VERSION',
      'v21.0',
    );
    this.baseUrl = this.configService.get<string>(
      'WHATSAPP_API_BASE_URL',
      'https://graph.facebook.com',
    );
  }

  /**
   * Create or get cached axios instance for a specific access token
   */
  private getAxiosInstance(accessToken: string): AxiosInstance {
    if (!this.axiosInstances.has(accessToken)) {
      const instance = axios.create({
        baseURL: `${this.baseUrl}/${this.apiVersion}`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      // Response interceptor for logging
      instance.interceptors.response.use(
        (response) => response,
        (error) => {
          this.logger.error(
            `WhatsApp API Error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`,
          );
          throw error;
        },
      );

      this.axiosInstances.set(accessToken, instance);
    }

    return this.axiosInstances.get(accessToken)!;
  }

  /**
   * Send a template message (for campaigns or 24h+ window)
   */
  async sendTemplateMessage(
    phoneNumberId: string,
    accessToken: string,
    data: SendTemplateMessageDto,
  ): Promise<any> {
    const axios = this.getAxiosInstance(accessToken);

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: data.to,
      type: 'template',
      template: {
        name: data.templateName,
        language: {
          code: data.languageCode,
        },
        components: data.components || [],
      },
    };

    try {
      this.logger.debug(
        `Sending template message to ${data.to} via ${phoneNumberId}`,
      );
      const response = await axios.post(`/${phoneNumberId}/messages`, payload);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to send template message: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send a text message (1x1 - requires active conversation within 24h)
   */
  async sendTextMessage(
    phoneNumberId: string,
    accessToken: string,
    data: SendTextMessageDto,
  ): Promise<any> {
    const axios = this.getAxiosInstance(accessToken);

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: data.to,
      type: 'text',
      text: {
        preview_url: data.previewUrl || false,
        body: data.text,
      },
    };

    try {
      this.logger.debug(
        `Sending text message to ${data.to} via ${phoneNumberId}`,
      );
      const response = await axios.post(`/${phoneNumberId}/messages`, payload);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to send text message: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send media message (image, video, audio, document)
   */
  async sendMediaMessage(
    phoneNumberId: string,
    accessToken: string,
    data: SendMediaMessageDto,
  ): Promise<any> {
    const axios = this.getAxiosInstance(accessToken);

    const mediaObject: any = {};
    if (data.mediaId) {
      mediaObject.id = data.mediaId;
    } else if (data.mediaUrl) {
      mediaObject.link = data.mediaUrl;
    }

    if (data.caption) {
      mediaObject.caption = data.caption;
    }

    if (data.type === 'document' && data.filename) {
      mediaObject.filename = data.filename;
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: data.to,
      type: data.type,
      [data.type]: mediaObject,
    };

    try {
      this.logger.debug(
        `Sending ${data.type} message to ${data.to} via ${phoneNumberId}`,
      );
      const response = await axios.post(`/${phoneNumberId}/messages`, payload);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to send media message: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(
    phoneNumberId: string,
    accessToken: string,
    messageId: string,
  ): Promise<any> {
    const axios = this.getAxiosInstance(accessToken);

    const payload = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    };

    try {
      const response = await axios.post(`/${phoneNumberId}/messages`, payload);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to mark message as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get media URL from media ID
   */
  async getMediaUrl(mediaId: string, accessToken: string): Promise<string> {
    const axios = this.getAxiosInstance(accessToken);

    try {
      const response = await axios.get(`/${mediaId}`);
      return response.data.url;
    } catch (error) {
      this.logger.error(`Failed to get media URL: ${error.message}`);
      throw error;
    }
  }

  /**
   * Download media from WhatsApp
   */
  async downloadMedia(
    mediaUrl: string,
    accessToken: string,
  ): Promise<Buffer> {
    try {
      const response = await axios.get(mediaUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`Failed to download media: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get business profile
   */
  async getBusinessProfile(
    phoneNumberId: string,
    accessToken: string,
  ): Promise<any> {
    const axios = this.getAxiosInstance(accessToken);

    try {
      const response = await axios.get(
        `/${phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get business profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get message templates
   */
  async getMessageTemplates(
    businessAccountId: string,
    accessToken: string,
  ): Promise<any> {
    const axios = this.getAxiosInstance(accessToken);

    try {
      const response = await axios.get(
        `/${businessAccountId}/message_templates?fields=name,language,status,category,components`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get message templates: ${error.message}`);
      throw error;
    }
  }
}
