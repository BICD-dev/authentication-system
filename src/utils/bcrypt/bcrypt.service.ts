import bcrypt from 'bcrypt';

export class BcryptService{
    private readonly saltRounds: number = 10;
    
    constructor(password: string, saltRounds: number = 10) {
        this.saltRounds = saltRounds;
    }
    /**
     * Hash the password using bcrypt
     * @returns a hashed string 
     */
    async hashPassword(password: string): Promise<string> {
        return await bcrypt.hash(password, this.saltRounds);
    }
    /**
     * Compare a password with a hashed password using bcrypt
     * @param hashedPassword - The hashed password to compare against
     * @returns a boolean indicating if the passwords match
     */
    async compare(password: string, hashedPassword:string): Promise<boolean> {
        return await bcrypt.compare(password, hashedPassword);
    }
}