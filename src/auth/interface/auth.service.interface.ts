import { CreateAccountDto } from "../dto/createAccount.dto"
import { ForgotPasswordDto } from "../dto/forgot-password.dto"
import { LoginWithPasswordDto } from "../dto/loginWithPassword.dto"
import { ResetPasswordDto } from "../dto/reset-password.dto"
import { VerifyEmailOtpDto } from "../dto/verifyEmailOtp.dto"

export interface IAuthService {
    // traditional email and password registration and login
    createAccountWithEmailPassword(data:CreateAccountDto): Promise<any>
    verifyEmailOtp(data:VerifyEmailOtpDto):Promise<any>
    loginWithPassword(data:LoginWithPasswordDto):Promise<any>
    refreshSession(rawRefreshToken:string):Promise<any>
    getProfile(userId:string):Promise<any>
    logout(rawRefreshToken:string):Promise<void>
    requestPasswordReset(data:ForgotPasswordDto):Promise<void>
    resetPassword(data:ResetPasswordDto):Promise<void>
}
