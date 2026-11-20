import { prisma } from "../lib/prisma";
import type { Prisma, Session } from "../generated/prisma/client";
import { IRepository } from "./interface/IRepository";

export interface CreateSessionInput {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    metadata?: Prisma.InputJsonValue;
}

// Ownership changes go through `user: { connect: ... }` in Prisma, so they are
// intentionally excluded from the plain update input.
export interface UpdateSessionInput {
    tokenHash?: string;
    metadata?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
    expiresAt?: Date;
    revokedAt?: Date | null;
}

export class SessionRepository implements IRepository<Session, CreateSessionInput, UpdateSessionInput> {

    async create(data: CreateSessionInput, tx?: Prisma.TransactionClient): Promise<Session> {
        const db = tx ?? prisma;
        return db.session.create({
            data: {
                userId: data.userId,
                tokenHash: data.tokenHash,
                expiresAt: data.expiresAt,
                metadata: data.metadata,
            },
        });
    }

    async findById(id: string, tx?: Prisma.TransactionClient): Promise<Session | null> {
        const db = tx ?? prisma;
        return db.session.findUnique({
            where: { id },
        });
    }

    async findByTokenHash(
        tokenHash: string,
        tx?: Prisma.TransactionClient
    ): Promise<Session | null> {
        const db = tx ?? prisma;
        return db.session.findUnique({
            where: { tokenHash },
        });
    }

    async findActiveByTokenHash(
        tokenHash: string,
        tx?: Prisma.TransactionClient
    ): Promise<Session | null> {
        const db = tx ?? prisma;
        return db.session.findFirst({
            where: {
                tokenHash,
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
        });
    }

    async update(
        id: string,
        data: UpdateSessionInput,
        tx?: Prisma.TransactionClient
    ): Promise<Session> {
        const db = tx ?? prisma;
        return db.session.update({
            where: { id },
            data,
        });
    }

    async delete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
        const db = tx ?? prisma;
        await db.session.delete({
            where: { id },
        });
    }

    /**
     * Atomically revoke an active session. Returns `false` when it was already
     * revoked, which guards refresh-token rotation against concurrent requests.
     */
    async revoke(id: string, tx?: Prisma.TransactionClient): Promise<boolean> {
        const db = tx ?? prisma;
        const result = await db.session.updateMany({
            where: { id, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        return result.count > 0;
    }

    async revokeByTokenHash(
        tokenHash: string,
        tx?: Prisma.TransactionClient
    ): Promise<boolean> {
        const db = tx ?? prisma;
        const result = await db.session.updateMany({
            where: { tokenHash, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        return result.count > 0;
    }

    async revokeAllForUser(userId: string, tx?: Prisma.TransactionClient): Promise<number> {
        const db = tx ?? prisma;
        const result = await db.session.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        return result.count;
    }
}
