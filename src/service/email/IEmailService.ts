// src/services/email/IEmailService.ts
export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
  }>;
}

export interface IEmailService {
  sendEmail(options: EmailOptions): Promise<void>;
}