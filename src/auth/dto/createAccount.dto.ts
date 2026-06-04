import { IsDefined, IsEmail, IsEmpty, IsPhoneNumber, IsString, Matches } from "class-validator";

export class CreateAccountDto {
    @IsDefined()
    @IsString()
    firstName!:string;

    @IsDefined()
    @IsString()
    lastName!:string;

    @IsDefined({message:"email must be defined"})
    @IsEmail()
    email!:string;

    @IsDefined({message:"password must be defined"})
    @Matches("/[A-Za-z0-9]/")
    password!:string;
}