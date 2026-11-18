import { CreateAccountDto } from "../dto/createAccount.dto"
import { LoginWithPasswordDto } from "../dto/loginWithPassword.dto"
import { VerifyEmailOtpDto } from "../dto/verifyEmailOtp.dto"

export interface IAuthService {
    // traditional email and password registration and login
    createAccountWithEmailPassword(data:CreateAccountDto): Promise<any>
    verifyEmailOtp(data:VerifyEmailOtpDto):Promise<any>
    loginWithPassword(data:LoginWithPasswordDto):Promise<any>
    refreshSession(rawRefreshToken:string):Promise<any>
    getProfile(userId:string):Promise<any>
    logout(rawRefreshToken:string):Promise<void>
}
