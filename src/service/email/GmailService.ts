// src/services/email/GmailService.ts
import nodemailer, { Transporter } from 'nodemailer';
import { IEmailService, EmailOptions } from './IEmailService';
import { Env } from '../../utils/config/config';

export class GmailService implements IEmailService {
  private transporter: Transporter;
  private defaultFrom: string;

  constructor() {
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
      logger: true,
      debug: true,
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    console.info('Attempting to send email to:', options.to);
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
      console.error('Failed to send email:', error.message || error);
      throw new Error(`Email sending failed: ${error.message || 'Internal Error'}`);
    }
  }
}