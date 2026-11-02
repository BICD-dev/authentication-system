import { UserRepository } from "../repositories/user.repository";
import { BcryptService } from "../utils/bcrypt/bcrypt.service";
import { JwtService } from "../utils/jwt/jwt.service";
import { AppError } from "../utils/middleware/errorHandler";
import { validateDto } from "../utils/validate.dto";
import { CreateAccountDto } from "./dto/createAccount.dto";
import { LoginWithPasswordDto } from "./dto/loginWithPassword.dto";
import { IAuthService } from "./interface/auth.service.interface";
import { prisma } from "../lib/prisma";
import "dotenv/config"
import { EventsService } from "../events/events.service";
import { VerifyEmailOtpDto } from "./dto/verifyEmailOtp.dto";
import { CacheFactory, CacheStore } from "../cache";
import { Env } from "../config/env";
// move this to an interface folder
interface loginResponse {
    user: {
        id: string,
        first_name: string | null,
        last_name: string | null,
        email: string | null,
    },
    token: string
}

export class AuthenticationService implements IAuthService {

    private readonly userRepository: UserRepository
    private readonly bcryptService: BcryptService
    private readonly jwtService: JwtService
    private readonly eventsService: EventsService
    private readonly redisCacheStore: CacheStore
    constructor() {
        this.userRepository = new UserRepository()
        this.bcryptService = new BcryptService()
        this.jwtService = new JwtService(Env.JWT_SECRET) 
        this.eventsService = new EventsService()
        this.redisCacheStore = CacheFactory.createCacheStore()
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

        return user;

    }
    async loginWithPassword(data: LoginWithPasswordDto): Promise<loginResponse> {
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

        // generate token
        const token = this.jwtService.generateToken({
            id: userExists.id,
            role: "user" // add role to db later
        })
        // update user's last login and emit event to trigger the sending of the login notification email
        await this.userRepository.updateLastLogin(userExists.id);
        if (userExists.email) {
            this.eventsService.emitUserLoggedIn({
                email: userExists.email,
                firstName: userExists.firstName,
            })
        }
        return {
            user: {
                id: userExists.id,
                first_name: userExists.firstName,
                last_name: userExists.lastName,
                email: userExists.email,
            },
            token

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
}