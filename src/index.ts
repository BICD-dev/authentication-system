import express from "express";
import helmet from "helmet";
import cors from "cors";
import authRouter from "./auth/auth.route";
import {globalErrorHandler,notFoundHandler} from "./utils/middleware/errorHandler";
import { registerEventHandlers } from "./events";
import { Env } from "./config/env";
import { prisma } from "./lib/prisma";
import { RedisCache } from "./cache";

const app = express();
const PORT = Env.PORT;

const redisClient = new RedisCache(Env.REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);

app.use(notFoundHandler);
app.use(globalErrorHandler);

let server: ReturnType<typeof app.listen> | undefined;
let isShuttingDown = false;

async function bootstrap() {
    try {
        await redisClient.connect();
        console.log("Redis connected successfully");

        await prisma.$connect();
        console.log("Database connected successfully");

        registerEventHandlers();

        server = app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Application startup failed:", error);

        await Promise.allSettled([
            redisClient.disconnect(),
            prisma.$disconnect()
        ]);

        process.exitCode = 1;
    }
}

const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`${signal} received. Starting graceful shutdown...`);

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
            redisClient.disconnect(),
            prisma.$disconnect()
        ]);

        results.forEach((result) => {
            if (result.status === "rejected") {
                console.error("Resource shutdown failed:", result.reason);
                process.exitCode = 1;
            }
        });

        console.log("Application shutdown completed.");

    } catch (error) {
        console.error("Error during graceful shutdown:", error);
        process.exitCode = 1;
    }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

bootstrap();