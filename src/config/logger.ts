import { createLogger, format, transports } from "winston";
import { Env } from "./env";

const readableFormat = format.printf(({ timestamp, level, message, ...meta }) => {
    const details = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${String(level).toUpperCase()}] ${String(message)}${details}`;
});

const outputFormat =
    Env.NODE_ENV === "production"
        ? format.json()
        : format.combine(format.colorize(), readableFormat);

/** The single logger used across the application. Never logs request bodies. */
export const logger = createLogger({
    level: Env.LOG_LEVEL,
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        outputFormat
    ),
    defaultMeta: { service: "authentication-system" },
    transports: [new transports.Console()],
});

if (Env.LOG_TO_FILE) {
    logger.add(new transports.File({ filename: "logs/error.log", level: "error" }));
    logger.add(new transports.File({ filename: "logs/app.log" }));
}
