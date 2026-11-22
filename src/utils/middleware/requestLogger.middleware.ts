import { randomUUID } from "crypto";
import type { RequestHandler } from "express";
import { logger } from "../../config/logger";

/** Query strings can contain tokens, so only the path portion is logged. */
function requestPath(url: string): string {
    const questionIndex = url.indexOf("?");
    return questionIndex === -1 ? url : url.slice(0, questionIndex);
}

/**
 * Assigns a request id, echoes it in the response headers, and emits one
 * completion log line per request. Bodies, cookies, and auth headers are never
 * included.
 */
export const requestLogger: RequestHandler = (req, res, next) => {
    const requestId = randomUUID();
    res.locals.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);

    const path = requestPath(req.originalUrl || req.url);
    const startedAt = process.hrtime.bigint();
    let completed = false;

    const context = () => ({
        requestId,
        method: req.method,
        path,
        ip: req.ip,
        userId: req.user?.id ?? null,
    });

    res.on("finish", () => {
        completed = true;
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        logger.info("http request completed", {
            ...context(),
            statusCode: res.statusCode,
            durationMs: Math.round(durationMs * 100) / 100,
        });
    });

    res.on("close", () => {
        if (!completed) {
            logger.warn("http request aborted", context());
        }
    });

    next();
};
