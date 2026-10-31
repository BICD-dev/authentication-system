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
    constructor() {
        this.userRepository = new UserRepository()
        this.bcryptService = new BcryptService()
        this.jwtService = new JwtService("secret") //use process from env later
        this.eventsService = new EventsService()
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
            // I'm pondering if to use email not found here. it could be a usability trade-off
            throw new AppError(401, "Incorrect user credentials { Email or Password )");
        }
        // verify user's password
        if (!userExists.password) {
            throw new AppError(401, "Incorrect user credentials { Email or Password )")
        }
        const validPassword = await this.bcryptService.compare(password, userExists.password);
        if (!validPassword) {
            throw new AppError(401, "Incorrect user credentials { Email or Password )")
        }
        // check that user's account is active
        // for now, the onlu way to actuvate the  account is through email verification, so i will just check if the email is verified, but later when i add phone number verification, i will check if either the email or phone number is verified
        if (!userExists.emailVerified) {
            // emit event to trigger the sending of the email verification otp
            throw new AppError(403, "User's account not activated, verify your email to activate your account")
        }

        // generate token
        const token = this.jwtService.generateToken({
            id: userExists.id,
            role: "user" // add role to db later
        })

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

    async verifyEmailOtp(): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                // validate input data
                // get the otp record from the database
                // check that the otp is valid and not expired
                // if valid, activate the user's account and delete the otp record
                resolve("Email/Phone verification successful")
            } catch (error) {
                reject(new AppError(500, "Failed to verify email/phone"))
            }
        })
    }
}