import { IsDefined, IsEmail, IsNotEmpty } from "class-validator";

export class ForgotPasswordDto {
    @IsDefined({ message: "email must be defined" })
    @IsEmail({}, { message: "email must be a valid email address" })
    @IsNotEmpty({ message: "email must not be empty" })
    email!: string;
}
