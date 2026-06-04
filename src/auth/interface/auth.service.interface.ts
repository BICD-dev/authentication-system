import { CreateAccountDto } from "../dto/createAccount.dto"
import { LoginWithPasswordDto } from "../dto/loginWithPassword.dto"

export interface IAuthService {
    // traditional email and password registration and login
    createAccountWithEmailPassword(data:CreateAccountDto): Promise<any>
    verifyEmailOtp():Promise<any>
    loginWithPassword(data:LoginWithPasswordDto):Promise<any>
}