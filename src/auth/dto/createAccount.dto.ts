import { IsDefined, IsEmail, IsNotEmpty, IsString, MaxLength, MinLength, } from "class-validator";

export class CreateAccountDto {
    @IsDefined({ message: "firstName must be defined" })
    @IsString({ message: "firstName must be a string" })
    @IsNotEmpty({ message: "firstName must not be empty" })
    @MaxLength(50, { message: "firstName must not exceed 50 characters" })
    firstName!: string;

    @IsDefined({ message: "lastName must be defined" })
    @IsString({ message: "lastName must be a string" })
    @IsNotEmpty({ message: "lastName must not be empty" })
    @MaxLength(50, { message: "lastName must not exceed 50 characters" })
    lastName!: string;

    @IsDefined({ message: "email must be defined" })
    @IsEmail({}, { message: "email must be a valid email address" })
    email!: string;

    @IsDefined({ message: "password must be defined" })
    @IsString({ message: "password must be a string" })
    @MinLength(8, { message: "password must be at least 8 characters" })
    password!: string;
}