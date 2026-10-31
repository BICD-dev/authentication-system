import { AppError } from "./middleware/errorHandler";

export type OtpRecordLike = {
  attempts: number;
  expires_at: Date;
  otp_hash: string;
};

export class OTPService {
  private readonly otpLength: number;
  private readonly otpExpiry: number; // in seconds
  private readonly maxAttempts: number = 5;

  constructor(otpLength: number = 6, otpExpiry: number = 300) {
    this.otpLength = otpLength;
    this.otpExpiry = otpExpiry;
  }
  generateVerificationExpiry(minutes = 15): Date {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);

    return now;
  }

  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // is otp valid based on expiry time :return boolean
  isOtpValid(expiryDate: Date): boolean {
    const now = new Date();
    return now < expiryDate;
  }

  // check otp validity based on expiry time and hashed code
  async validateOtp(
    otpRecord: OtpRecordLike | null | undefined,
    providedCode: string,
    compareFn: (provided: string, hashed: string) => Promise<boolean>,
    onInvalidAttempt?: () => Promise<void>,
  ): Promise<void> {
    if (!otpRecord) {
      throw new AppError(404,"OTP request not found");
    }

    // Check Rate Limiting (Attempts)
    if (otpRecord.attempts >= this.maxAttempts) {
      throw new AppError(429,"Too many failed attempts. Request a new code.");
    }
    // check expiry time
    if (!this.isOtpValid(otpRecord.expires_at)) {
      throw new AppError(400,"Verification code has expired. Please request a new one.");
    }

    if (!otpRecord.otp_hash) {
      throw new AppError(404,"OTP request not found");
    }

    // Check Code Match
    const isValid = await compareFn(providedCode, otpRecord.otp_hash);
    if (!isValid) {
      if (onInvalidAttempt) {
        await onInvalidAttempt();
      }
      throw new AppError(401,"Invalid verification code");
    }
  }
}
