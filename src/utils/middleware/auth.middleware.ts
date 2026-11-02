import type { NextFunction, Request, Response } from "express";
import { Env } from "../../config/env";
import { JwtService } from "../jwt/jwt.service";
import { AppError } from "./errorHandler";

export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email?: string | null;
    role?: string;
  };
};

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      throw new AppError(401, "Unauthorized: missing bearer token");
    }

    const jwtService = new JwtService(Env.JWT_SECRET);
    const payload = await jwtService.verifyToken(token);

    if (!payload || typeof payload !== "object" || !payload.id) {
      throw new AppError(401, "Unauthorized: invalid token payload");
    }

    req.user = {
      id: String(payload.id),
      email: typeof payload.email === "string" ? payload.email : null,
      role: typeof payload.role === "string" ? payload.role : undefined,
    };

    next();
  } catch (error) {
    next(error instanceof Error ? error : new AppError(401, "Unauthorized"));
  }
};
