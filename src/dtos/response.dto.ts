import { IsEnum, IsOptional, IsString } from "class-validator";
import { IResponse, ResponseStatus } from "./interface/response.interface";

export class ResponseDto implements IResponse {
    @IsEnum(ResponseStatus)
    status: ResponseStatus;

    @IsString()
    message: string;

    @IsOptional()
    data?: any;

    constructor(
        status:ResponseStatus,
        message:string,
        data?: any
    ) {
        this.status = status;
        this.message = message;
        this.data = data
    }
}