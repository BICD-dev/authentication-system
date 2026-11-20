import { createHash, randomBytes } from "crypto";
import { UserRepository } from "../repositories/user.repository";
import { MagicLinkRepository } from "../repositories/magic-link.repository";
import { BcryptService } from "../utils/bcrypt/bcrypt.service";
import { JwtService } from "../utils/jwt/jwt.service";
import { AppError } from "../utils/middleware/errorHandler";
import { validateDto } from "../utils/validate.dto";
import { CreateAccountDto } from "./dto/createAccount.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginWithPasswordDto } from "./dto/loginWithPassword.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { IAuthService } from "./interface/auth.service.interface";
import { prisma } from "../lib/prisma";
import "dotenv/config"
import { EventsService } from "../events/events.service";
import { VerifyEmailOtpDto } from "./dto/verifyEmailOtp.dto";
import { CacheFactory, CacheStore } from "../cache";
import { Env } from "../config/env";
import { SessionMetadata, SessionService } from "../session/session.service";
import { MagicLinkType, UserStatus, type User } from "../generated/prisma/client";
import { toUserResponse, UserResponse } from "../dtos/user-response.dto";
// move this to an interface folder
interface AuthSessionResult {
    user: UserResponse,
    accessToken: string,
    refreshToken: string,
}

export class AuthenticationService implements IAuthService {

    private readonly userRepository: UserRepository
    private readonly magicLinkRepository: MagicLinkRepository
    private readonly bcryptService: BcryptService
    private readonly jwtService: JwtService
    private readonly eventsService: EventsService
    private readonly redisCacheStore: CacheStore
    private readonly sessionService: SessionService
    constructor() {
        this.userRepository = new UserRepository()
        this.magicLinkRepository = new MagicLinkRepository()
        this.bcryptService = new BcryptService()
        this.jwtService = new JwtService(Env.JWT_SECRET, Env.JWT_EXPIRES_IN)
        this.eventsService = new EventsService()
        this.redisCacheStore = CacheFactory.createCacheStore()
        this.sessionService = new SessionService()
    }

    async createAccountWithEmailPassword(data: CreateAccountDto): Promise<any> {
        // make this validateDto a middleware later
        const validate = await validateDto(CreateAccountDto, data);
        const { firstName, lastName, email, password } = validate;

        // check if email already exists
        const emailExists = await this.userRepository.findByEmail(email);
        if (emailExists) {
            // define different error handlers for common errors
            throw new AppError(409, "The provided Email already exists")
        }
        // hash user's password
        const hashedPassword = await this.bcryptService.hashPassword(password)

        // create the user's account and send welcome email and email verification otp to user's email

        const user = await this.userRepository.create({
            email,
            firstName,
            lastName,
            password: hashedPassword
        });

        if (user.email) {
            this.eventsService.emitUserRegistered({
                userId: user.id,
                email: user.email,
                firstName: user.firstName,
            });
        }

        return toUserResponse(user);

    }
    async loginWithPassword(data: LoginWithPasswordDto, metadata?: SessionMetadata): Promise<AuthSessionResult> {
        const validate = await validateDto(LoginWithPasswordDto, data);
        const { email, password } = validate;
        // check that user's email or phone exists
        const userExists = await this.userRepository.findByEmail(email);
        if (!userExists) {
            throw new AppError(401, "Incorrect user credentials { Email or Password )");
        }
        if (!userExists.password) {
            throw new AppError(401, "Incorrect user credentials { Email or Password )")
        }
        const validPassword = await this.bcryptService.compare(password, userExists.password);
        if (!validPassword) {
            throw new AppError(401, "Incorrect user credentials { Email or Password )")
        }
        // check that user's account is active
        // for now, the onlu way to actuvate the  account is through email verification, so i will just check if the email is verified, but later when i add phone number verification, i will check if either the email or phone number is verified
        if (!userExists.emailVerifiedAt) {
            // emit event to trigger the sending of the email verification otp
            if (userExists.email) {
                this.eventsService.emitSendVerificationEmail({
                    userId: userExists.id,
                    firstName: userExists.firstName,
                    email: email,
                })
            }
            throw new AppError(403, "User's account not activated, verify your email to activate your account")
        }

        // issue an access token and a refresh-token session
        const session = await this.createSessionForUser(userExists, metadata)
        // update user's last login and emit event to trigger the sending of the login notification email
        // await this.userRepository.updateLastLogin(userExists.id);
        if (userExists.email) {
            this.eventsService.emitUserLoggedIn({
                email: userExists.email,
                firstName: userExists.firstName,
            })
        }
        // ill specify the specific details to return later, for now im doing it in the controller...
        return session
    }

    async refreshSession(rawRefreshToken: string, metadata?: SessionMetadata): Promise<AuthSessionResult> {
        const rotated = await this.sessionService.rotateSession(rawRefreshToken, metadata)
        const user = await this.userRepository.findById(rotated.session.userId)

        if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
            await this.sessionService.revokeAllSessionsForUser(rotated.session.userId)
            throw new AppError(401, "This account is not active")
        }

        return {
            user: toUserResponse(user),
            accessToken: this.generateAccessToken(user),
            refreshToken: rotated.refreshToken,
        }
    }

    async getProfile(userId: string): Promise<UserResponse> {
        const user = await this.userRepository.findById(userId);

        if (!user || user.deletedAt) {
            throw new AppError(401, "User not found");
        }

        if (user.status !== UserStatus.ACTIVE) {
            throw new AppError(403, "This account is not active");
        }

        return toUserResponse(user);
    }

    async logout(rawRefreshToken: string): Promise<void> {
        await this.sessionService.revokeSession(rawRefreshToken);
    }

    async requestPasswordReset(data: ForgotPasswordDto): Promise<void> {
        const {email} = await validateDto(ForgotPasswordDto, data);
        const user = await this.userRepository.findByEmail(email);

        if (!user || user.deletedAt || !user.email) {
            return;
        }
        // create token and hash it
        const token = this.generateResetToken();
        const tokenHash = this.hashResetToken(token);
        const expiresAt = new Date(
            Date.now() + Env.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60_000
        );

        await this.magicLinkRepository.createReplacingActive({
            userId: user.id,
            email: user.email,
            tokenHash,
            type: MagicLinkType.PASSWORD_RESET,
            expiresAt,
        });

        this.eventsService.emitSendPasswordResetEmail({
            email: user.email,
            firstName: user.firstName,
            token,
        });
    }

    async resetPassword(data: ResetPasswordDto): Promise<void> {
        const validate = await validateDto(ResetPasswordDto, data);
        const tokenHash = this.hashResetToken(validate.token);
        const resetLink = await this.magicLinkRepository.findByTokenHash(
            tokenHash,
            MagicLinkType.PASSWORD_RESET
        );

        if (
            !resetLink ||
            resetLink.usedAt ||
            resetLink.expiresAt.getTime() <= Date.now()
        ) {
            throw new AppError(400, "Invalid or expired password reset token");
        }

        const user = resetLink.userId
            ? await this.userRepository.findById(resetLink.userId)
            : await this.userRepository.findByEmail(resetLink.email);

        if (!user || user.deletedAt || !user.email) {
            throw new AppError(400, "Invalid or expired password reset token");
        }

        // A link issued to an old email address must stop working after the
        // account email changes.
        if (user.email.trim().toLowerCase() !== resetLink.email.trim().toLowerCase()) {
            throw new AppError(400, "Invalid or expired password reset token");
        }

        const hashedPassword = await this.bcryptService.hashPassword(
            validate.newPassword
        );

        await prisma.$transaction(async (tx) => {
            // Compare-and-set the link so concurrent requests cannot both reset
            // the password with the same token.
            const consumed = await this.magicLinkRepository.consume(
                resetLink.id,
                tx
            );

            if (!consumed) {
                throw new AppError(400, "Invalid or expired password reset token");
            }

            // Invalidate any other outstanding reset links for this account.
            await this.magicLinkRepository.invalidateActiveForUser(
                user.id,
                MagicLinkType.PASSWORD_RESET,
                tx
            );

            await this.userRepository.update(
                user.id,
                {
                    password: hashedPassword,
                    passwordChangedAt: new Date(),
                },
                tx
            );
        });

        await this.sessionService.revokeAllSessionsForUser(user.id);

        if (user.email) {
            this.eventsService.emitPasswordChanged({
                email: user.email,
                firstName: user.firstName,
            });
        }
    }

    async verifyEmailOtp(data: VerifyEmailOtpDto): Promise<any> {
        // validate input data
        const validate = await validateDto(VerifyEmailOtpDto, data);
        const { email, otp } = validate;
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new AppError(404, "User not found");
        }

        const otpKey = `email_verification:${user.id}`;
        const otpRecordRaw = await this.redisCacheStore.get(otpKey);
        if (!otpRecordRaw) {
            throw new AppError(400, "OTP is invalid or has expired");
        }

        let otpRecord: { code?: string; expiresAt?: string };
        try {
            otpRecord = JSON.parse(otpRecordRaw);
        } catch {
            throw new AppError(400, "OTP is invalid or has expired");
        }

        if (!otpRecord.code || otpRecord.code !== otp) {
            throw new AppError(400, "OTP is invalid or has expired");
        }

        const expiresAt = otpRecord.expiresAt ? new Date(otpRecord.expiresAt) : null;
        if (!expiresAt || expiresAt.getTime() <= Date.now()) {
            await this.redisCacheStore.del(otpKey);
            throw new AppError(400, "OTP is invalid or has expired");
        }

        // if valid, activate the user's account and delete the otp record
        await this.userRepository.setEmailVerifiedAt(user.id);
        await this.redisCacheStore.del(otpKey);
        return { message: "Email verified successfully" };
    }

    async resendEmailVerificationOtp(email: string): Promise<void> {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            console.log(`user with email ${email} does not exist `);
            return;
        }
        if (user.emailVerifiedAt) {
            console.log(`user with email ${email} is already verified `);
            return;
        }
        // emit event to trigger the sending of the email verification otp
        this.eventsService.emitSendVerificationEmail({
            userId: user.id,
            firstName: user.firstName,
            email: email,
        });

        return;
    }

    private async createSessionForUser(user: User, metadata?: SessionMetadata): Promise<AuthSessionResult> {
        const { refreshToken } = await this.sessionService.createSession(user.id, metadata)

        return {
            user: toUserResponse(user),
            accessToken: this.generateAccessToken(user),
            refreshToken,
        }
    }

    private generateAccessToken(user: User): string {
        return this.jwtService.generateToken({
            id: user.id,
            email: user.email,
            role: "user" // add role to db later
        })
    }

    private generateResetToken(): string {
        return randomBytes(32).toString("base64url");
    }

    private hashResetToken(token: string): string {
        return createHash("sha256").update(token).digest("hex");
    }
}