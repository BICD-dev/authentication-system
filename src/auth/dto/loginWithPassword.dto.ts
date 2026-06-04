import { IsDefined, IsEmail, IsEmpty, IsString } from "class-validator";

export class LoginWithPasswordDto {
    @IsDefined()
    @IsEmail()
    @IsEmpty()
    email!:string;

    @IsDefined()
    @IsString()
    password!:string;
}