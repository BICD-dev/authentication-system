import { ApiErrorDetail, ApiResponse } from "./interface/response.interface";

export class ResponseDto<T = unknown> implements ApiResponse<T> {
    success: boolean;
    statusCode: number;
    message: string;
    data?: T;
    errors?: ApiErrorDetail[];

    private constructor(args: {
        success: boolean;
        statusCode: number;
        message: string;
        data?: T;
        errors?: ApiErrorDetail[];
    }) {
        this.success = args.success;
        this.statusCode = args.statusCode;
        this.message = args.message;
        this.data = args.data;
        this.errors = args.errors;
    }

    static success<T>(statusCode: number, message: string, data?: T): ResponseDto<T> {
        return new ResponseDto<T>({
            success: true,
            statusCode,
            message,
            data,
        });
    }

    static failure(
        statusCode: number,
        message: string,
        errors?: ApiErrorDetail[]
    ): ResponseDto<never> {
        return new ResponseDto<never>({
            success: false,
            statusCode,
            message,
            errors,
        });
    }
}
