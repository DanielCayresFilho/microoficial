import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

export interface WhatsAppBusinessAccountSummary {
  businessId: string;
  businessName: string;
  currency: string | null;
  timezoneId: string | null;
  parentBusinessId: string;
  parentBusinessName: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly apiVersion: string;
  private readonly baseUrl: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.appId = this.configService.get<string>('META_APP_ID') || '';
    this.appSecret = this.configService.get<string>('META_APP_SECRET') || '';
    this.apiVersion = this.configService.get<string>(
      'WHATSAPP_API_VERSION',
      'v21.0',
    );
    this.baseUrl = this.configService.get<string>(
      'WHATSAPP_API_BASE_URL',
      'https://graph.facebook.com',
    );

    if (!this.appId || !this.appSecret) {
      this.logger.warn(
        'META_APP_ID or META_APP_SECRET not configured. Embedded Signup will not work.',
      );
    }
  }

  /**
   * Generate OAuth URL for Embedded Signup
   */
  generateOAuthUrl(state?: string): string {
    if (!this.appId) {
      throw new BadRequestException('META_APP_ID not configured');
    }

    const redirectUri = this.configService.get<string>(
      'OAUTH_REDIRECT_URI',
      'http://localhost:3000/api/auth/whatsapp/callback',
    );

    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      state: state || this.generateRandomState(),
      // Scopes for WhatsApp Business API
      scope: 'business_management,whatsapp_business_management,whatsapp_business_messaging',
      response_type: 'code',
    });

    return `https://www.facebook.com/${this.apiVersion}/dialog/oauth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<{
    accessToken: string;
    tokenType: string;
    expiresIn: number;
  }> {
    try {
      const redirectUri = this.configService.get<string>(
        'OAUTH_REDIRECT_URI',
        'http://localhost:3000/api/auth/whatsapp/callback',
      );

      const response = await axios.get(
        `${this.baseUrl}/${this.apiVersion}/oauth/access_token`,
        {
          params: {
            client_id: this.appId,
            client_secret: this.appSecret,
            redirect_uri: redirectUri,
            code,
          },
        },
      );

      this.logger.log('Successfully exchanged code for access token');

      return {
        accessToken: response.data.access_token,
        tokenType: response.data.token_type,
        expiresIn: response.data.expires_in,
      };
    } catch (error) {
      this.logger.error(
        `Failed to exchange code for token: ${error.response?.data?.error?.message || error.message}`,
      );
      throw new BadRequestException(
        `OAuth token exchange failed: ${error.response?.data?.error?.message || error.message}`,
      );
    }
  }

  /**
   * Get long-lived access token from short-lived token
   */
  async getLongLivedToken(shortLivedToken: string): Promise<{
    accessToken: string;
    tokenType: string;
    expiresIn: number;
  }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.apiVersion}/oauth/access_token`,
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: this.appId,
            client_secret: this.appSecret,
            fb_exchange_token: shortLivedToken,
          },
        },
      );

      this.logger.log('Successfully obtained long-lived token');

      return {
        accessToken: response.data.access_token,
        tokenType: response.data.token_type,
        expiresIn: response.data.expires_in,
      };
    } catch (error) {
      this.logger.error(`Failed to get long-lived token: ${error.message}`);
      throw new BadRequestException(
        `Failed to get long-lived token: ${error.message}`,
      );
    }
  }

  /**
   * Get WhatsApp Business Accounts associated with the token
   */
  async getWhatsAppBusinessAccounts(
    accessToken: string,
  ): Promise<WhatsAppBusinessAccountSummary[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.apiVersion}/me/businesses`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            fields: 'id,name,whatsapp_business_accounts{id,name,currency,timezone_id}',
          },
        },
      );

      const businesses = response.data.data || [];
      const wabas: WhatsAppBusinessAccountSummary[] = [];

      for (const business of businesses) {
        if (business.whatsapp_business_accounts?.data) {
          for (const waba of business.whatsapp_business_accounts.data) {
            wabas.push({
              businessId: waba.id,
              businessName: waba.name,
              currency: waba.currency ?? null,
              timezoneId: waba.timezone_id ?? null,
              parentBusinessId: business.id,
              parentBusinessName: business.name,
            });
          }
        }
      }

      return wabas;
    } catch (error) {
      this.logger.error(
        `Failed to get WhatsApp Business Accounts: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to get WhatsApp Business Accounts: ${error.message}`,
      );
    }
  }

  /**
   * Get phone numbers for a WhatsApp Business Account
   */
  async getPhoneNumbers(
    wabaId: string,
    accessToken: string,
  ): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.apiVersion}/${wabaId}/phone_numbers`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            fields: 'id,display_phone_number,verified_name,quality_rating,is_official_business_account',
          },
        },
      );

      return response.data.data || [];
    } catch (error) {
      this.logger.error(`Failed to get phone numbers: ${error.message}`);
      throw new BadRequestException(
        `Failed to get phone numbers: ${error.message}`,
      );
    }
  }

  /**
   * Complete setup: Create account and numbers in database
   */
  async completeSetup(
    accessToken: string,
    wabaId: string,
    accountName?: string,
  ) {
    try {
      // Get or create account
      let account = await this.prisma.account.findUnique({
        where: { businessId: wabaId },
      });

      if (account) {
        // Update existing account
        account = await this.prisma.account.update({
          where: { id: account.id },
          data: {
            accessToken,
            name: accountName || account.name,
            isActive: true,
          },
        });
        this.logger.log(`Updated existing account: ${account.id}`);
      } else {
        // Create new account
        account = await this.prisma.account.create({
          data: {
            businessId: wabaId,
            name: accountName || `WABA ${wabaId}`,
            accessToken,
            isActive: true,
          },
        });
        this.logger.log(`Created new account: ${account.id}`);
      }

      // Get phone numbers
      const phoneNumbers = await this.getPhoneNumbers(wabaId, accessToken);

      // Create or update phone numbers
      for (const phone of phoneNumbers) {
        const existingNumber = await this.prisma.number.findUnique({
          where: { phoneNumberId: phone.id },
        });

        if (existingNumber) {
          await this.prisma.number.update({
            where: { id: existingNumber.id },
            data: {
              displayName: phone.display_phone_number,
              verifiedName: phone.verified_name,
              qualityRating: phone.quality_rating,
              isActive: true,
            },
          });
          this.logger.log(`Updated phone number: ${phone.id}`);
        } else {
          await this.prisma.number.create({
            data: {
              accountId: account.id,
              phoneNumber: phone.display_phone_number,
              phoneNumberId: phone.id,
              displayName: phone.display_phone_number,
              verifiedName: phone.verified_name,
              qualityRating: phone.quality_rating,
              isActive: true,
            },
          });
          this.logger.log(`Created phone number: ${phone.id}`);
        }
      }

      return {
        account,
        phoneNumbers: phoneNumbers.length,
      };
    } catch (error) {
      this.logger.error(`Failed to complete setup: ${error.message}`);
      throw error;
    }
  }

  /**
   * Debug: Get token info
   */
  async debugToken(accessToken: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/debug_token`,
        {
          params: {
            input_token: accessToken,
            access_token: `${this.appId}|${this.appSecret}`,
          },
        },
      );

      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to debug token: ${error.message}`);
      throw new BadRequestException(`Failed to debug token: ${error.message}`);
    }
  }

  private generateRandomState(): string {
    return Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
  }
}
