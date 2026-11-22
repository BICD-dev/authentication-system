import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./auth/auth.route";
import { corsOptions } from "./config/cors";
import { Env } from "./config/env";
import { logger } from "./config/logger";
import { globalErrorHandler, notFoundHandler } from "./utils/middleware/errorHandler";
import { registerEventHandlers } from "./events";
import { prisma } from "./lib/prisma";
import { CacheFactory } from "./cache";
import { requestLogger } from "./utils/middleware/requestLogger.middleware";

const app = express();
const PORT = Env.PORT;

app.use(requestLogger);
app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

app.use("/api/auth", authRouter);

app.use(notFoundHandler);
app.use(globalErrorHandler);

let server: ReturnType<typeof app.listen> | undefined;
let isShuttingDown = false;

async function bootstrap() {
    try {
        Env.assertEmailConfig();

        await CacheFactory.connect();
        logger.info("Cache connected", { provider: Env.CACHE_PROVIDER });

        await prisma.$connect();
        logger.info("Database connected");

        registerEventHandlers();

        server = app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        logger.error("Application startup failed", {
            name: error instanceof Error ? error.name : "UnknownError",
            stack: error instanceof Error ? error.stack : String(error),
        });

        await Promise.allSettled([CacheFactory.disconnect(), prisma.$disconnect()]);

        process.exitCode = 1;
    }
}

const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`${signal} received. Starting graceful shutdown...`);

    try {
        if (server) {
            await new Promise<void>((resolve, reject) => {
                server!.close((error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });
        }

        const results = await Promise.allSettled([
            CacheFactory.disconnect(),
            prisma.$disconnect(),
        ]);

        results.forEach((result) => {
            if (result.status === "rejected") {
                logger.error("Resource shutdown failed", {
                    name: result.reason instanceof Error ? result.reason.name : "UnknownError",
                    stack: result.reason instanceof Error ? result.reason.stack : String(result.reason),
                });
                process.exitCode = 1;
            }
        });

        logger.info("Application shutdown completed.");
    } catch (error) {
        logger.error("Error during graceful shutdown", {
            name: error instanceof Error ? error.name : "UnknownError",
            stack: error instanceof Error ? error.stack : String(error),
        });
        process.exitCode = 1;
    }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

bootstrap();
