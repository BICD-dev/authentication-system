import { IsDefined, IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginWithPasswordDto {
    @IsDefined({ message: "email must be defined" })
    @IsEmail({}, { message: "email must be a valid email address" })
    @IsNotEmpty({ message: "email must not be empty" })
    email!:string;

    @IsDefined({ message: "password must be defined" })
    @IsString({ message: "password must be a string" })
    @IsNotEmpty({ message: "password must not be empty" })
    password!:string;
}