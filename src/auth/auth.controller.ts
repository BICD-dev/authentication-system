import { Response , Request, NextFunction, RequestHandler } from "express";
import { AuthenticationService } from "./auth.service";
import { ResponseDto } from "../dtos/response.dto";
import { HttpStatus } from "../constant/http-status.enum";
import { ResponseStatus } from "../dtos/interface/response.interface";
import { SuccessMessages } from "../constant/success-messages.enum";
import { AppError } from "../utils/middleware/errorHandler";

export class AuthController {
    private readonly authService: AuthenticationService;

    constructor(){
        this.authService = new AuthenticationService()
    }

    createAccountWithEmailPassword:RequestHandler =  async (req:Request,res:Response, next:NextFunction)=>{
        try {
            const data = req.body;
            const result = await this.authService.createAccountWithEmailPassword(data);
            const resObj = new ResponseDto(ResponseStatus.SUCCESS, SuccessMessages.REGISTRATION_SUCCESSFUL, result);
            return res.status(HttpStatus.CREATED).json(resObj);
        } catch (error) {
            next(error)
        }
    }

    loginWithPassword:RequestHandler = async  (req:Request, res:Response,  next:NextFunction)=> {
        try {
            const data = req.body;
            const result = await this.authService.loginWithPassword(data);
            // create a session for the  user
            // This implementation is temporary
            res.cookie("login",result.token,{
                expires: new Date(Date.now() + 900000),
                 httpOnly: true, 
                  sameSite:"lax" // change to strict later
            })
            const resObj = new ResponseDto(ResponseStatus.SUCCESS, SuccessMessages.LOGIN_SUCCESSFUL)
            return res.status(HttpStatus.OK).json(resObj);
        } catch (error) {
            next(error)
        }
    }

    verifyEmailOtp:RequestHandler = async (req:Request, res:Response, next:NextFunction)=>{
        try {
            const data = req.body;
            const result = await this.authService.verifyEmailOtp(data);
            const resObj = new ResponseDto(ResponseStatus.SUCCESS, SuccessMessages.EMAIL_VERIFICATION_SUCCESSFUL, result);
            return res.status(HttpStatus.OK).json(resObj);
        } catch (error) {
            next(error)
        }
    }

    resendEmailOtp:RequestHandler = async (req:Request, res:Response, next:NextFunction)=>{
        try {
            const { email } = req.query;
            if (!email) {
                throw new AppError(400, "Email query parameter is required");
            }
            await this.authService.resendEmailVerificationOtp(email as string);
            const resObj = new ResponseDto(ResponseStatus.SUCCESS, SuccessMessages.EMAIL_VERIFICATION_RESENT);
            return res.status(HttpStatus.OK).json(resObj);
        } catch (error) {
            next(error)
        }
    }
}