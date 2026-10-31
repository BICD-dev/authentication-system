import { eventBus } from "../event-bus";
import { AuthEvents } from "../events.constants";
import { UserRegisteredEventPayload } from "../interface/auth.events.interface";
import { EmailServiceFactory } from "../../service/email/EmailServiceFactory";
import { OTPService } from "../../utils/otp.service";
import { CacheFactory } from "../../cache/cache.factory";

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

export function registerAuthEventHandlers(): void {
    eventBus.on(AuthEvents.USER_REGISTERED, async (payload: UserRegisteredEventPayload) => {
        const { userId, email, firstName } = payload;
        
        try {
            await sendWelcomeEmail( email, firstName);
            await sendVerificationEmail(userId, email, firstName);
        } catch (error) {
            console.error("Error handling USER_REGISTERED event:", error);
        }
    });
}

export async function sendWelcomeEmail( email: string, firstName: string | null): Promise<void> {
    const emailService = EmailServiceFactory.createEmailService();
    try {
        await emailService.sendEmail({
            to: email,
            subject: "Welcome to Bright Authentication System",
            html: buildWelcomeEmailHtml(firstName),
        });
    }
    catch (error) {
        console.error("Failed to send welcome email:", error);
    }
}

export async function sendVerificationEmail(userId: string, email: string, firstName: string | null): Promise<void> {
    const emailService = EmailServiceFactory.createEmailService();
    const otpService = new OTPService();
    const verificationCode = otpService.generateVerificationCode();
    const verificationExpiry = otpService.generateVerificationExpiry(15);
    const cache = CacheFactory.createCacheStore();
    await cache.set(`email_verification:${userId}`, JSON.stringify({ code: verificationCode, expiresAt: verificationExpiry }), 15 * 60); // store for 15 minutes
    try {
        await emailService.sendEmail({
            to: email,
            subject: "Verify your email",
            html: buildVerificationEmailHtml(firstName, verificationCode),
        });
    } catch (error) {
        console.error("Failed to send verification email:", error);
    }
}
