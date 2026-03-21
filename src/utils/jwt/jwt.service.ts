import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

export class JwtService {
    private readonly secretKey: string;
    private readonly expiresIn: number;
    constructor(secretKey: string, expiresIn: number = 3600*3) {
        this.secretKey = secretKey;
        this.expiresIn = expiresIn;
    }

    /**
     * 
     * @param token 
     * verifies token returned from request
     * @returns 
     */
    async verifyToken(token: string): Promise<JwtPayload> {
        try {
            const decoded = jwt.verify(token, this.secretKey) as JwtPayload;
            return decoded;
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    /**
     * 
     * @param payload 
     * generate a token with the given payload
     * @returns token as string
     */
    generateToken(payload: JwtPayload): string {
        const options: SignOptions = {
            expiresIn: this.expiresIn,
        };
        const token =  jwt.sign(payload, this.secretKey, options );
        return token;
    }
}