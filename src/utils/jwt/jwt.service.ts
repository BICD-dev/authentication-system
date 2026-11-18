import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { HttpStatus } from '../../constant/http-status.enum';
import { AppError } from '../middleware/errorHandler';
import { parseDurationToMs } from '../time';

export class JwtService {
    private readonly secretKey: string;
    private readonly expiresInSeconds: number;
    constructor(secretKey: string, expiresIn: string | number = "3h") {
        this.secretKey = secretKey;
        // jsonwebtoken treats numeric expiresIn values as seconds, so convert
        // the configured duration once and keep the unit unambiguous.
        this.expiresInSeconds = Math.max(
            1,
            Math.floor(parseDurationToMs(expiresIn) / 1000)
        );
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
            throw new AppError(
                HttpStatus.UNAUTHORIZED,
                'Invalid or expired access token'
            );
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
            expiresIn: this.expiresInSeconds,
        };
        const token =  jwt.sign(payload, this.secretKey, options );
        return token;
    }
}
