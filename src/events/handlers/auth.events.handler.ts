import { eventBus } from "../event-bus";
import { AuthEvents } from "../events.constants";
import {
    PasswordChangedEventPayload,
    SendPasswordResetEmailEventPayload,
    SendVerificationEmailEventPayload,
    UserRegisteredEventPayload,
} from "../interface/auth.events.interface";
import { EmailServiceFactory } from "../../service/email/EmailServiceFactory";
import { OTPService } from "../../utils/otp.service";
import { Env } from "../../config/env";
import { logger } from "../../config/logger";

function logEventHandlerError(context: string, error: unknown): void {
    logger.error(`${context} failed`, {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
    });
}

// seperate these email templates later
function buildWelcomeEmailHtml(firstName?: string | null): string {
    const displayName = firstName ?? "there";

    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
      <h2 style="margin-bottom: 12px;">Welcome, ${displayName}!</h2>
      <p>Your account has been created successfully.</p>
      <p>We are glad to have you with us.</p>
    </div>
  `;
}

function buildVerificationEmailHtml(firstName: string | null | undefined, verificationCode: string): string {
    const displayName = firstName ?? "there";

    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
      <h2 style="margin-bottom: 12px;">Verify your email, ${displayName}</h2>
      <p>Use the code below to verify your account:</p>
      <p style="font-size: 24px; letter-spacing: 4px; font-weight: 700; margin: 16px 0;">${verificationCode}</p>
      <p>If you did not create this account, please ignore this email.</p>
    </div>
  `;
}

function buildLoginNotificationEmailHtml(firstName: string | null | undefined): string {
    const displayName = firstName ?? "there";
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
      <h2 style="margin-bottom: 12px;">Hello, ${displayName}</h2>
        <p>We noticed a login to your account. If this was you, no further action is needed.</p>
        <p>If you did not log in, please secure your account immediately.</p>
    </div>
  `;
}

function buildPasswordResetEmailHtml(
    firstName: string | null | undefined,
    resetUrl: string,
    expiresInMinutes: number
): string {
    const displayName = firstName ?? "there";

    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
      <h2 style="margin-bottom: 12px;">Reset your password, ${displayName}</h2>
      <p>We received a request to reset the password for your account.</p>
      <p style="margin: 16px 0;">
        <a href="${resetUrl}" style="background: #2563eb; color: #ffffff; padding: 10px 16px; border-radius: 6px; text-decoration: none;">
          Reset password
        </a>
      </p>
      <p>This link expires in ${expiresInMinutes} minutes and can only be used once.</p>
      <p>If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `;
}

function buildPasswordChangedEmailHtml(firstName: string | null | undefined): string {
    const displayName = firstName ?? "there";

    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
      <h2 style="margin-bottom: 12px;">Your password was changed, ${displayName}</h2>
      <p>Your account password was changed successfully.</p>
      <p>For your security, all active sessions have been signed out.</p>
      <p>If you did not make this change, reset your password immediately and contact support.</p>
    </div>
  `;
}


export function registerAuthEventHandlers(): void {
    eventBus.on(AuthEvents.USER_REGISTERED, async (payload: UserRegisteredEventPayload) => {
        const { userId, email, firstName } = payload;
        
        try {
            await sendWelcomeEmail( email, firstName);
            await sendVerificationEmail(userId, email, firstName);
        } catch (error) {
            logEventHandlerError("USER_REGISTERED event", error);
        }
    });
}

export function sendVerificationEmailEventHandler(): void {
    eventBus.on(AuthEvents.SEND_VERIFICATION_EMAIL, async (payload: SendVerificationEmailEventPayload) => {
        const { userId, email, firstName } = payload;

        try {
            await sendVerificationEmail(userId, email, firstName);
        } catch (error) {
            logEventHandlerError("SEND_VERIFICATION_EMAIL event", error);
        }
    });
}

export function loginEventHandler(): void {
    eventBus.on(AuthEvents.USER_LOGGED_IN, async (payload: any) => {
        const { firstName, email } = payload;
        try {
            const emailService = EmailServiceFactory.createEmailService();
            await emailService.sendEmail({
                to: email,
                subject: "Login Notification",
                html: buildLoginNotificationEmailHtml(firstName),
            });
        } catch (error) {
            logEventHandlerError("USER_LOGGED_IN event", error);
        }
    });
}

export function passwordResetEmailEventHandler(): void {
    eventBus.on(AuthEvents.SEND_PASSWORD_RESET_EMAIL, async (payload: SendPasswordResetEmailEventPayload) => {
        const { email, firstName, token } = payload;

        try {
            const emailService = EmailServiceFactory.createEmailService();
            const baseUrl = Env.FRONTEND_URL.replace(/\/+$/, "");
            const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

            await emailService.sendEmail({
                to: email,
                subject: "Reset your password",
                html: buildPasswordResetEmailHtml(
                    firstName,
                    resetUrl,
                    Env.PASSWORD_RESET_TOKEN_TTL_MINUTES
                ),
            });
        } catch (error) {
            logEventHandlerError("SEND_PASSWORD_RESET_EMAIL event", error);
        }
    });
}

export function passwordChangedEventHandler(): void {
    eventBus.on(AuthEvents.PASSWORD_CHANGED, async (payload: PasswordChangedEventPayload) => {
        const { email, firstName } = payload;

        try {
            const emailService = EmailServiceFactory.createEmailService();
            await emailService.sendEmail({
                to: email,
                subject: "Your password was changed",
                html: buildPasswordChangedEmailHtml(firstName),
            });
        } catch (error) {
            logEventHandlerError("PASSWORD_CHANGED event", error);
        }
    });
}

async function sendWelcomeEmail( email: string, firstName: string | null): Promise<void> {
    const emailService = EmailServiceFactory.createEmailService();
    try {
        await emailService.sendEmail({
            to: email,
            subject: "Welcome to Bright Authentication System",
            html: buildWelcomeEmailHtml(firstName),
        });
    }
    catch (error) {
        logEventHandlerError("welcome email", error);
    }
}

async function sendVerificationEmail(userId: string, email: string, firstName: string | null): Promise<void> {
    const emailService = EmailServiceFactory.createEmailService();
    const otpService = new OTPService();
    const verificationCode = await otpService.createOtp(userId, email);

    try {
        await emailService.sendEmail({
            to: email,
            subject: "Verify your email",
            html: buildVerificationEmailHtml(firstName, verificationCode),
        });
    } catch (error) {
        logEventHandlerError("verification email", error);
    }
}
