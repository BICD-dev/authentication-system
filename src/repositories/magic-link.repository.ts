import { prisma } from "../lib/prisma";
import type { MagicLink, MagicLinkType, Prisma } from "../generated/prisma/client";
import { IRepository } from "./interface/IRepository";

export interface CreateMagicLinkInput {
    userId?: string;
    email: string;
    tokenHash: string;
    type: MagicLinkType;
    expiresAt: Date;
    usedAt?: Date;
}

export type UpdateMagicLinkInput = Partial<Omit<MagicLink, "id" | "createdAt">>;

export class MagicLinkRepository implements IRepository<MagicLink, CreateMagicLinkInput, UpdateMagicLinkInput> {

    async create(data: CreateMagicLinkInput, tx?: Prisma.TransactionClient): Promise<MagicLink> {
        const db = tx ?? prisma;
        return db.magicLink.create({
            data: {
                userId: data.userId,
                email: data.email.trim().toLowerCase(),
                tokenHash: data.tokenHash,
                type: data.type,
                expiresAt: data.expiresAt,
                usedAt: data.usedAt,
            },
        });
    }

    async findById(id: string, tx?: Prisma.TransactionClient): Promise<MagicLink | null> {
        const db = tx ?? prisma;
        return db.magicLink.findUnique({
            where: { id },
        });
    }

    /**
     * `tokenHash` is not unique at the database level, so this returns the first
     * match. Passing the link `type` narrows the lookup to one flow.
     */
    async findByTokenHash(
        tokenHash: string,
        type?: MagicLinkType,
        tx?: Prisma.TransactionClient
    ): Promise<MagicLink | null> {
        const db = tx ?? prisma;
        return db.magicLink.findFirst({
            where: {
                tokenHash,
                ...(type ? { type } : {}),
            },
        });
    }

    async update(
        id: string,
        data: UpdateMagicLinkInput,
        tx?: Prisma.TransactionClient
    ): Promise<MagicLink> {
        const db = tx ?? prisma;
        return db.magicLink.update({
            where: { id },
            data: {
                ...data,
                ...(typeof data.email === "string"
                    ? { email: data.email.trim().toLowerCase() }
                    : {}),
            },
        });
    }

    async delete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
        const db = tx ?? prisma;
        await db.magicLink.delete({
            where: { id },
        });
    }

    /**
     * Atomically mark a link as used. Returns `false` when the link was already
     * consumed, which makes it safe against concurrent submissions.
     */
    async consume(id: string, tx?: Prisma.TransactionClient): Promise<boolean> {
        const db = tx ?? prisma;
        const result = await db.magicLink.updateMany({
            where: { id, usedAt: null },
            data: { usedAt: new Date() },
        });
        return result.count > 0;
    }

    /**
     * Mark every unused link of a given type for a user as used, so only the
     * newest link can be redeemed.
     */
    async invalidateActiveForUser(
        userId: string,
        type: MagicLinkType,
        tx?: Prisma.TransactionClient
    ): Promise<number> {
        const db = tx ?? prisma;
        const result = await db.magicLink.updateMany({
            where: { userId, type, usedAt: null },
            data: { usedAt: new Date() },
        });
        return result.count;
    }

    /**
     * Create a link while invalidating the user's previous unused links of the
     * same type in one transaction.
     */
    async createReplacingActive(data: CreateMagicLinkInput): Promise<MagicLink> {
        return prisma.$transaction(async (tx) => {
            if (data.userId) {
                await this.invalidateActiveForUser(data.userId, data.type, tx);
            }
            return this.create(data, tx);
        });
    }
}
