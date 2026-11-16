import type {
    ErrorRequestHandler,
    NextFunction,
    Request,
    RequestHandler,
    Response,
} from "express";
import { ErrorMessages } from "../../constant/error-messages.enum";
import { HttpStatus } from "../../constant/http-status.enum";
import { ApiErrorDetail } from "../../dtos/interface/response.interface";
import { ResponseDto } from "../../dtos/response.dto";

export class ErrorHandler extends Error {
    statusCode: number;
    isOperational: boolean;
    errors?: ApiErrorDetail[];

    constructor(
        statusCode: number,
        message: string,
        isOperational = true,
        errors?: ApiErrorDetail[]
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.errors = errors;

        Object.setPrototypeOf(this, new.target.prototype);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export class AppError extends ErrorHandler {
    constructor(statusCode: number, message: string, errors?: ApiErrorDetail[]) {
        super(statusCode, message, true, errors);
    }
}

export const asyncHandler = (handler: RequestHandler): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
};

export const notFoundHandler: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(HttpStatus.NOT_FOUND, `${ErrorMessages.NOT_FOUND}: ${req.originalUrl}`));
};

export const methodNotAllowed = (allowedMethods: string[]): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        res.set("Allow", allowedMethods.join(", "));
        next(new AppError(HttpStatus.METHOD_NOT_ALLOWED, ErrorMessages.METHOD_NOT_ALLOWED));
    };
};

export const globalErrorHandler: ErrorRequestHandler = (
    err,
    _req,
    res,
    _next
) => {
    const isHandledError = err instanceof ErrorHandler;
    const statusCode = isHandledError ? err.statusCode : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHandledError ? err.message : ErrorMessages.INTERNAL_SERVER_ERROR;
    const errors = isHandledError ? err.errors : undefined;

    res.status(statusCode).json(ResponseDto.failure(statusCode, message, errors));
};
