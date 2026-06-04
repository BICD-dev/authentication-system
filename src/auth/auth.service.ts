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
export class AuthenticationService implements IAuthService{
    
    private readonly userRepository : UserRepository
    private readonly bcryptService : BcryptService
    private readonly jwtService : JwtService
    constructor(){
        this.userRepository = new UserRepository()
        this.bcryptService = new BcryptService()
        this.jwtService = new JwtService("secret") //use process from env later
    }

    async createAccountWithEmailPassword(data:CreateAccountDto): Promise<any>{
        const validate = await validateDto(CreateAccountDto, data);
        const {firstName, lastName, email, password } = validate;
        
        // check if email already exists
        const emailExists = await this.userRepository.findByEmail(email);
        if(emailExists){
            throw new AppError(409, "Email already exists")
        }
        // hash user's password
        const hashedPassword = await this.bcryptService.hashPassword(password)
        // create the user's account and add password to credentials within a transaction
        try {
            const createdUser = await prisma.$transaction(async (tx) => {
                const user = await this.userRepository.create({
                    email,
                    firstName,
                    lastName,
                }, tx);

                await this.userRepository.createCredential({
                    user_id: user.id,
                    passwordHash: hashedPassword,
                }, tx);
                // send email verification otp to user's email here later
                return user;
            });

            return createdUser;
        } catch (error) {
            throw new AppError(500, "Failed to create account");
        }

    }

    async loginWithPassword(data:LoginWithPasswordDto): Promise<any> {
        const validate = await validateDto(LoginWithPasswordDto, data);
        const {email, password} = validate;
        // check that user's email or phone exists
        const userExists = await this.userRepository.findByEmail(email);
        if(!userExists){
            throw new AppError(404, "Incorrect user credentials");
        }
        // get user's credentials
        const credential = await this.userRepository.findCredentialByUserId(userExists.id);
        if(!credential || !credential.passwordHash){
            throw new AppError(404, "Incorrect user credentials")
        }
        // validate user's password
        const validPassword = await this.bcryptService.compare(password, credential.passwordHash);
        if(!validPassword) {
            throw new AppError(404, "Incorrect user credentials")
        }
        // check that user's account is active
        // for now, the onlu way to actuvate the  account is through email verification, so i will just check if the email is verified, but later when i add phone number verification, i will check if either the email or phone number is verified
        if(!userExists.emailVerified){
            // send otp to the email 
            throw new AppError(403,"User's account not activated, verify your email to activate your account")
        }

        // generate token
        const token = this.jwtService.generateToken({
            id:userExists.id,
            role:"user" // add role to db later
        })

        return {
            user:{
                id:userExists.id,
                first_name:userExists.firstName,
                last_name:userExists.lastName,
                email:userExists.email,
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