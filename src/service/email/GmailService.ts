// src/services/email/GmailService.ts
import nodemailer, { Transporter } from 'nodemailer';
import { IEmailService, EmailOptions } from './IEmailService';
import { Env } from '../../config/env';
import { logger } from '../../config/logger';

export class GmailService implements IEmailService {
  private transporter: Transporter;
  private defaultFrom: string;

  constructor() {
    if (!Env.EMAIL_USER || !Env.EMAIL_APP_PASSWORD) {
      throw new Error('EMAIL_USER and EMAIL_APP_PASSWORD are required when EMAIL_PROVIDER=gmail');
    }

    this.defaultFrom = Env.EMAIL_USER;

    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: Env.EMAIL_USER,
        pass: Env.EMAIL_APP_PASSWORD,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    logger.info('Sending email via Gmail', {
      to: options.to,
      subject: options.subject,
    });
    try {
      await this.transporter.sendMail({
        from: options.from || this.defaultFrom,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      });
    } catch (error: any) {
      logger.error('Failed to send email via Gmail', {
        message: error?.message ?? String(error),
        stack: error?.stack ?? undefined,
      });
      throw new Error(`Email sending failed: ${error.message || 'Internal Error'}`);
    }
  }
}
