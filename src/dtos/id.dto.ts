import { IsNotEmpty, IsOptional, IsUUID } from "class-validator";

export class IdDto {
    @IsOptional()
    @IsNotEmpty({message:"user id must not be empty"})
    @IsUUID("all",{message:"user id must be a valid uuid"})
    user_id?:string;

}