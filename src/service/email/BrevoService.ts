import nodemailer, { Transporter } from 'nodemailer';
import { IEmailService, EmailOptions } from './IEmailService';
import { Env } from '../../utils/config/config';

export class BrevoService implements IEmailService {
  private transporter: Transporter;
  private defaultFrom: string;

  constructor() {
    if (!Env.BREVO_SMTP_LOGIN || !Env.BREVO_SMTP_KEY || !Env.BREVO_SENDER_EMAIL) {
      throw new Error(
        'BREVO_SMTP_LOGIN, BREVO_SMTP_KEY, and BREVO_SENDER_EMAIL are required when EMAIL_PROVIDER=brevo'
      );
    }

    this.defaultFrom = Env.BREVO_SENDER_NAME
      ? `${Env.BREVO_SENDER_NAME} <${Env.BREVO_SENDER_EMAIL}>`
      : Env.BREVO_SENDER_EMAIL;

    this.transporter = nodemailer.createTransport({
      host: Env.BREVO_SMTP_HOST,
      port: Env.BREVO_SMTP_PORT,
      secure: Env.BREVO_SMTP_PORT === 465,
      auth: {
        user: Env.BREVO_SMTP_LOGIN,
        pass: Env.BREVO_SMTP_KEY,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      logger: true,
      debug: true,
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    console.info('Attempting to send email via Brevo to:', options.to);

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
      console.error('Failed to send email with Brevo:', error.message || error);
      throw new Error(`Email sending failed: ${error.message || 'Internal Error'}`);
    }
  }
}