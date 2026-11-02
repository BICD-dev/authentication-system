import { IsDefined, IsEmail, IsNotEmpty, Matches } from "class-validator";

export class VerifyEmailOtpDto {
    @IsDefined({ message: "email must be defined" })
    @IsEmail({}, { message: "email must be a valid email address" })
    email!: string;

    @IsDefined({ message: "otp must be defined" })
    @IsNotEmpty({ message: "otp must not be empty" })
    @Matches(/^\d{6}$/, { message: "otp must be a 6-digit number" })
    otp!: string;
}