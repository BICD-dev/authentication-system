import type { CorsOptions } from "cors";
import { HttpStatus } from "../constant/http-status.enum";
import { AppError } from "../utils/middleware/errorHandler";
import { Env } from "./env";

const ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const ALLOWED_HEADERS = ["Content-Type", "Authorization", "X-CSRF-Token"];

const isOriginAllowed = (origin: string): boolean =>
    (Env.NODE_ENV === "development" && Env.CORS_ALLOW_ALL_ORIGINS) ||
    Env.CORS_ALLOWED_ORIGINS.includes(origin);

export const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        // Requests without an Origin header (curl, server-to-server) are not
        // subject to browser CORS checks.
        if (!origin || isOriginAllowed(origin)) {
            callback(null, true);
            return;
        }

        callback(new AppError(HttpStatus.FORBIDDEN, "Origin not allowed by CORS"));
    },
    credentials: true,
    methods: ALLOWED_METHODS,
    allowedHeaders: ALLOWED_HEADERS,
    maxAge: Env.CORS_MAX_AGE_SECONDS,
    optionsSuccessStatus: HttpStatus.NO_CONTENT,
};
