import type { NextFunction, Request, Response } from "express";
import { Env } from "../../config/env";
import { HttpStatus } from "../../constant/http-status.enum";
import { getCookie } from "../cookies";
import { JwtService } from "../jwt/jwt.service";
import { csrfProtection } from "./csrf.middleware";
import { AppError } from "./errorHandler";

function extractAccessToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const match = /^Bearer\s+(.+)$/i.exec(authHeader);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return getCookie(req, Env.ACCESS_TOKEN_COOKIE_NAME);
}

/**
 * Verifies the access token and, for unsafe methods that rely on auth cookies,
 * enforces the CSRF double-submit check first. Bearer requests and safe methods
 * skip the CSRF half automatically.
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  csrfProtection(req, res, (csrfError?: unknown) => {
    if (csrfError) {
      next(csrfError);
      return;
    }

    void verifyAccessToken(req, res, next);
  });
};

const verifyAccessToken = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractAccessToken(req);

    if (!token) {
      throw new AppError(
        HttpStatus.UNAUTHORIZED,
        "Unauthorized: missing access token"
      );
    }

    const jwtService = new JwtService(Env.JWT_SECRET, Env.JWT_EXPIRES_IN);
    const payload = await jwtService.verifyToken(token);

    if (!payload || typeof payload !== "object" || !payload.id) {
      throw new AppError(
        HttpStatus.UNAUTHORIZED,
        "Unauthorized: invalid token payload"
      );
    }

    req.user = {
      id: String(payload.id),
      email: typeof payload.email === "string" ? payload.email : null,
      role: typeof payload.role === "string" ? payload.role : undefined,
    };

    next();
  } catch (error) {
    next(error);
  }
};
