import { IsDefined, IsNotEmpty, IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
    @IsDefined({ message: "token must be defined" })
    @IsString({ message: "token must be a string" })
    @IsNotEmpty({ message: "token must not be empty" })
    token!: string;

    @IsDefined({ message: "newPassword must be defined" })
    @IsString({ message: "newPassword must be a string" })
    @MinLength(8, { message: "newPassword must be at least 8 characters" })
    newPassword!: string;
}
