import {
  Controller,
  Get,
  Query,
  Res,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  AuthService,
  WhatsAppBusinessAccountSummary,
} from './auth.service';
import { Public } from './public.decorator';
import * as path from 'path';
import * as fs from 'fs';

@Public()
@Controller('auth/whatsapp')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Serve signup page
   * GET /api/auth/whatsapp/signup-page
   */
  @Get('signup-page')
  serveSignupPage(@Res() res: Response) {
    const htmlPath = path.join(__dirname, 'templates', 'signup.html');
    if (fs.existsSync(htmlPath)) {
      return res.sendFile(htmlPath);
    }
    return res.status(HttpStatus.NOT_FOUND).send('Signup page not found');
  }

  /**
   * Initiate WhatsApp Embedded Signup flow
   * GET /api/auth/whatsapp
   */
  @Get()
  async initiateSignup(@Query('state') state?: string) {
    try {
      const oauthUrl = this.authService.generateOAuthUrl(state);
      return {
        url: oauthUrl,
        message: 'Redirect user to this URL to start WhatsApp signup',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * OAuth callback endpoint
   * GET /api/auth/whatsapp/callback
   */
  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    try {
      // Check for errors from Meta
      if (error) {
        this.logger.error(`OAuth error: ${error} - ${errorDescription}`);
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error,
          errorDescription,
        });
      }

      if (!code) {
        throw new BadRequestException('Authorization code is required');
      }

      this.logger.log('Processing OAuth callback');

      // Exchange code for access token
      const tokenData = await this.authService.exchangeCodeForToken(code);

      // Get long-lived token
      const longLivedToken = await this.authService.getLongLivedToken(
        tokenData.accessToken,
      );

      // Get WhatsApp Business Accounts
      const wabas = await this.authService.getWhatsAppBusinessAccounts(
        longLivedToken.accessToken,
      );

      if (wabas.length === 0) {
        return res.status(HttpStatus.OK).json({
          success: false,
          message: 'No WhatsApp Business Accounts found',
        });
      }

      // Setup first WABA automatically
      const firstWaba = wabas[0];
      const setupResult = await this.authService.completeSetup(
        longLivedToken.accessToken,
        firstWaba.businessId,
        firstWaba.businessName,
      );

      this.logger.log(
        `Successfully setup account: ${setupResult.account.id} with ${setupResult.phoneNumbers} phone numbers`,
      );

      // Return success page
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'WhatsApp Business Account connected successfully',
        data: {
          accountId: setupResult.account.id,
          accountName: setupResult.account.name,
          businessId: setupResult.account.businessId,
          phoneNumbers: setupResult.phoneNumbers,
          allWabas: wabas,
        },
      });
    } catch (error) {
      this.logger.error(`Callback error: ${error.message}`, error.stack);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Manually setup a specific WABA
   * GET /api/auth/whatsapp/setup?wabaId=xxx&accessToken=xxx
   */
  @Get('setup')
  async manualSetup(
    @Query('wabaId') wabaId: string,
    @Query('accessToken') accessToken: string,
    @Query('accountName') accountName?: string,
  ) {
    if (!wabaId || !accessToken) {
      throw new BadRequestException('wabaId and accessToken are required');
    }

    try {
      const result = await this.authService.completeSetup(
        accessToken,
        wabaId,
        accountName,
      );

      return {
        success: true,
        message: 'Account setup completed',
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get all WhatsApp Business Accounts for a token
   * GET /api/auth/whatsapp/accounts?accessToken=xxx
   */
  @Get('accounts')
  async getAccounts(
    @Query('accessToken') accessToken: string,
  ): Promise<{
    success: boolean;
    count: number;
    data: WhatsAppBusinessAccountSummary[];
  }> {
    if (!accessToken) {
      throw new BadRequestException('accessToken is required');
    }

    try {
      const wabas = await this.authService.getWhatsAppBusinessAccounts(
        accessToken,
      );

      return {
        success: true,
        count: wabas.length,
        data: wabas,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Debug token (development only)
   * GET /api/auth/whatsapp/debug?accessToken=xxx
   */
  @Get('debug')
  async debugToken(@Query('accessToken') accessToken: string) {
    if (!accessToken) {
      throw new BadRequestException('accessToken is required');
    }

    try {
      const tokenInfo = await this.authService.debugToken(accessToken);

      return {
        success: true,
        data: tokenInfo,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
