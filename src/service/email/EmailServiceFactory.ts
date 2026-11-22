import { IEmailService } from './IEmailService';
import { GmailService } from './GmailService';
import { BrevoService } from './BrevoService';
import { Env, type EmailProvider } from '../../config/env';

const instances = new Map<EmailProvider, IEmailService>();

/** Returns one cached service per provider so the SMTP transporter is reused. */
export class EmailServiceFactory {
  static createEmailService(): IEmailService {
    const provider = Env.EMAIL_PROVIDER;
    const existing = instances.get(provider);
    if (existing) {
      return existing;
    }

    let service: IEmailService;
    switch (provider) {
      case 'gmail':
        service = new GmailService();
        break;
      case 'brevo':
        service = new BrevoService();
        break;
      default:
        throw new Error(`Unsupported email provider: ${provider}`);
    }

    instances.set(provider, service);
    return service;
  }
}
