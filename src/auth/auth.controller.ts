import { Response , Request, NextFunction, RequestHandler } from "express";
import { AuthenticationService } from "./auth.service";
import { ResponseDto } from "../dtos/response.dto";
import { HttpStatus } from "../constant/http-status.enum";
import { SuccessMessages } from "../constant/success-messages.enum";
import { AppError } from "../utils/middleware/errorHandler";
import { Env } from "../config/env";
import { getCookie, setAuthCookies } from "../utils/cookies";
import { SessionMetadata } from "../session/session.service";

function getSessionMetadata(req: Request): SessionMetadata {
    return {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
    };
}

export class AuthController {
    private readonly authService: AuthenticationService;

    constructor(){
        this.authService = new AuthenticationService()
    }

    createAccountWithEmailPassword:RequestHandler =  async (req:Request,res:Response, next:NextFunction)=>{
        try {
            const data = req.body;
            const result = await this.authService.createAccountWithEmailPassword(data);
            const resObj = ResponseDto.success(
                HttpStatus.CREATED,
                SuccessMessages.REGISTRATION_SUCCESSFUL,
                result
            );
            return res.status(HttpStatus.CREATED).json(resObj);
        } catch (error) {
            next(error)
        }
    }

    loginWithPassword:RequestHandler = async  (req:Request, res:Response,  next:NextFunction)=> {
        try {
            const data = req.body;
            const result = await this.authService.loginWithPassword(
                data,
                getSessionMetadata(req)
            );
            setAuthCookies(res, {
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            });
            const resObj = ResponseDto.success(
                HttpStatus.OK,
                SuccessMessages.LOGIN_SUCCESSFUL,
                {
                    user: result.user,
                    accessToken: result.accessToken,
                    tokenType: "Bearer",
                    expiresIn: Env.JWT_EXPIRES_IN,
                }
            );
            return res.status(HttpStatus.OK).json(resObj);
        } catch (error) {
            next(error)
        }
    }

    refreshSession:RequestHandler = async (req:Request, res:Response, next:NextFunction)=>{
        try {
            const refreshToken = getCookie(req, Env.REFRESH_TOKEN_COOKIE_NAME);
            if (!refreshToken) {
                throw new AppError(
                    HttpStatus.UNAUTHORIZED,
                    "Missing refresh token"
                );
            }

            const result = await this.authService.refreshSession(
                refreshToken,
                getSessionMetadata(req)
            );
            setAuthCookies(res, {
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            });
            const resObj = ResponseDto.success(
                HttpStatus.OK,
                SuccessMessages.TOKEN_REFRESHED,
                {
                    user: result.user,
                    accessToken: result.accessToken,
                    tokenType: "Bearer",
                    expiresIn: Env.JWT_EXPIRES_IN,
                }
            );
            return res.status(HttpStatus.OK).json(resObj);
        } catch (error) {
            next(error)
        }
    }

    verifyEmailOtp:RequestHandler = async (req:Request, res:Response, next:NextFunction)=>{
        try {
            const data = req.body;
            const result = await this.authService.verifyEmailOtp(data);
            const resObj = ResponseDto.success(
                HttpStatus.OK,
                SuccessMessages.EMAIL_VERIFICATION_SUCCESSFUL,
                result
            );
            return res.status(HttpStatus.OK).json(resObj);
        } catch (error) {
            next(error)
        }
    }

    resendEmailOtp:RequestHandler = async (req:Request, res:Response, next:NextFunction)=>{
        try {
            const { email } = req.query;
            if (!email) {
                throw new AppError(
                    HttpStatus.BAD_REQUEST,
                    "Email query parameter is required"
                );
            }
            await this.authService.resendEmailVerificationOtp(email as string);
            const resObj = ResponseDto.success(
                HttpStatus.OK,
                SuccessMessages.EMAIL_VERIFICATION_RESENT
            );
            return res.status(HttpStatus.OK).json(resObj);
        } catch (error) {
            next(error)
        }
    }
}