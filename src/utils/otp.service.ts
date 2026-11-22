import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { CacheFactory, type CacheStore } from "../cache";
import { Env } from "../config/env";
import { HttpStatus } from "../constant/http-status.enum";
import { AppError } from "./middleware/errorHandler";
import { ErrorMessages } from "../constant/error-messages.enum";

export type OtpRecord = {
    otpHash: string;
    expiresAt: string;
    attempts: number;
    userId: string;
    email: string;
    consumedAt?: string | null;
};


/**
 * Owns the full email-verification OTP lifecycle. Codes are generated with
 * crypto.randomInt, stored only as HMAC-SHA256 hashes, and track failed
 * attempts so a single code cannot be brute-forced.
 */
export class OTPService {
    private readonly cache: CacheStore;
    private readonly otpLength: number;
    private readonly otpTtlSeconds: number;
    private readonly maxAttempts: number;

    constructor() {
        this.cache = CacheFactory.createCacheStore();
        this.otpLength = Env.OTP_LENGTH;
        this.otpTtlSeconds = Env.OTP_TTL_MINUTES * 60;
        this.maxAttempts = Env.OTP_MAX_ATTEMPTS;

        if (
            !Number.isInteger(this.otpLength) ||
            this.otpLength < 4 ||
            this.otpLength > 10
        ) {
            throw new Error("OTP_LENGTH must be an integer between 4 and 10");
        }
        if (!Number.isInteger(this.maxAttempts) || this.maxAttempts < 1) {
            throw new Error("OTP_MAX_ATTEMPTS must be a positive integer");
        }
    }

    private cacheKey(userId: string): string {
        return `email_verification:${userId}`;
    }

    generateVerificationCode(): string {
        const min = 10 ** (this.otpLength - 1);
        const max = 10 ** this.otpLength - 1;
        return randomInt(min, max + 1).toString();
    }

    hashOtp(code: string): string {
        return createHmac("sha256", Env.OTP_PEPPER).update(code).digest("hex");
    }

    /** Issues a new code, replacing any outstanding code for the same user. */
    async createOtp(userId: string, email: string): Promise<string> {
        const code = this.generateVerificationCode();
        const record: OtpRecord = {
            otpHash: this.hashOtp(code),
            expiresAt: new Date(Date.now() + this.otpTtlSeconds * 1000).toISOString(),
            attempts: 0,
            userId,
            email,
            consumedAt: null,
        };

        await this.cache.set(
            this.cacheKey(userId),
            JSON.stringify(record),
            this.otpTtlSeconds,
        );

        return code;
    }

    private async readRecord(userId: string): Promise<OtpRecord | null> {
        const raw = await this.cache.get(this.cacheKey(userId));
        if (!raw) {
            return null;
        }

        try {
            const record = JSON.parse(raw) as OtpRecord;
            if (
                typeof record.otpHash !== "string" ||
                typeof record.expiresAt !== "string" ||
                !Number.isFinite(record.attempts) ||
                typeof record.email !== "string"
            ) {
                return null;
            }
            return record;
        } catch {
            return null;
        }
    }

    private async writeRecord(userId: string, record: OtpRecord): Promise<void> {
        const remainingSeconds = Math.max(
            1,
            Math.ceil((new Date(record.expiresAt).getTime() - Date.now()) / 1000),
        );
        await this.cache.set(
            this.cacheKey(userId),
            JSON.stringify(record),
            remainingSeconds,
        );
    }

    /** Verifies a code and consumes the record on success. */
    async verifyOtp(userId: string, email: string, code: string): Promise<void> {
        const key = this.cacheKey(userId);
        const record = await this.readRecord(userId);

        if (!record || record.consumedAt) {
            throw new AppError(HttpStatus.BAD_REQUEST, ErrorMessages.INVALID_OTP_MESSAGE);
        }

        if (record.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
            throw new AppError(HttpStatus.BAD_REQUEST, ErrorMessages.INVALID_OTP_MESSAGE);
        }

        if (new Date(record.expiresAt).getTime() <= Date.now()) {
            await this.cache.del(key);
            throw new AppError(HttpStatus.BAD_REQUEST, ErrorMessages.INVALID_OTP_MESSAGE);
        }

        if (record.attempts >= this.maxAttempts) {
            throw new AppError(
                HttpStatus.TOO_MANY_REQUESTS,
                "Too many failed OTP attempts. Request a new code.",
            );
        }

        const expected = Buffer.from(record.otpHash, "hex");
        const provided = Buffer.from(this.hashOtp(code), "hex");

        if (
            expected.length !== provided.length ||
            !timingSafeEqual(expected, provided)
        ) {
            record.attempts += 1;
            await this.writeRecord(userId, record);
            throw new AppError(HttpStatus.BAD_REQUEST, ErrorMessages.INVALID_OTP_MESSAGE);
        }

        record.consumedAt = new Date().toISOString();
        await this.writeRecord(userId, record);
    }
}
