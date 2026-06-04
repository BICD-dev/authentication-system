// src/services/email/EmailServiceFactory.ts
import { IEmailService } from './IEmailService';
import { GmailService } from './GmailService';
import { BrevoService } from './BrevoService';
import { Env } from '../../utils/config/config';

export class EmailServiceFactory {
  static createEmailService(): IEmailService {
    const provider = Env.EMAIL_PROVIDER;

    switch (provider.toLowerCase()) {
      case 'gmail':
        return new GmailService();
      case 'brevo':
        return new BrevoService();
      default:
        return new GmailService();
    }
  }
}