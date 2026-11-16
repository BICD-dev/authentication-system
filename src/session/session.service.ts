import { createHash, randomBytes } from "crypto";
import { Env } from "../config/env";
import type { Prisma, Session } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/middleware/errorHandler";
import { parseDurationToMs } from "../utils/time";

export interface SessionMetadata {
	ip?: string;
	userAgent?: string;
}

export interface IssuedSession {
	refreshToken: string;
	session: Session;
}

export class SessionService {
	/**
	 * Create a new refresh-token session. Only the SHA-256 hash of the token is
	 * persisted; the raw token is returned to the caller exactly once.
	 */
	async createSession(
		userId: string,
		metadata?: SessionMetadata
	): Promise<IssuedSession> {
		const refreshToken = this.generateRefreshToken();

		const session = await prisma.session.create({
			data: {
				userId,
				tokenHash: this.hashToken(refreshToken),
				expiresAt: this.getRefreshTokenExpiry(),
				metadata: this.serializeMetadata(metadata),
			},
		});

		return { refreshToken, session };
	}

	/**
	 * Rotate a refresh token: revoke the current session and issue a new one.
	 * If a revoked token is presented again, treat it as reuse and revoke every
	 * active session for that user.
	 */
	async rotateSession(
		rawRefreshToken: string,
		metadata?: SessionMetadata
	): Promise<IssuedSession> {
		const tokenHash = this.hashToken(rawRefreshToken);
		const session = await prisma.session.findFirst({ where: { tokenHash } });

		if (!session) {
			throw new AppError(401, "Invalid refresh token");
		}

		if (session.revokedAt) {
			await this.revokeAllSessionsForUser(session.userId);
			throw new AppError(
				401,
				"Refresh token reuse detected. Please sign in again."
			);
		}

		if (session.expiresAt.getTime() <= Date.now()) {
			await prisma.session.updateMany({
				where: { id: session.id, revokedAt: null },
				data: { revokedAt: new Date() },
			});
			throw new AppError(401, "Refresh token expired. Please sign in again.");
		}

		// Guard against two concurrent refreshes using the same token. Only one
		// request can transition the session from active to revoked.
		const revoked = await prisma.session.updateMany({
			where: { id: session.id, revokedAt: null },
			data: { revokedAt: new Date() },
		});

		if (revoked.count === 0) {
			await this.revokeAllSessionsForUser(session.userId);
			throw new AppError(
				401,
				"Refresh token reuse detected. Please sign in again."
			);
		}

		const refreshToken = this.generateRefreshToken();
		const newSession = await prisma.session.create({
			data: {
				userId: session.userId,
				tokenHash: this.hashToken(refreshToken),
				expiresAt: this.getRefreshTokenExpiry(),
				metadata: this.serializeMetadata(metadata),
			},
		});

		return { refreshToken, session: newSession };
	}

	async revokeSession(rawRefreshToken: string): Promise<boolean> {
		const result = await prisma.session.updateMany({
			where: { tokenHash: this.hashToken(rawRefreshToken), revokedAt: null },
			data: { revokedAt: new Date() },
		});

		return result.count > 0;
	}

	async revokeAllSessionsForUser(userId: string): Promise<number> {
		const result = await prisma.session.updateMany({
			where: { userId, revokedAt: null },
			data: { revokedAt: new Date() },
		});

		return result.count;
	}

	async findActiveSession(rawRefreshToken: string): Promise<Session | null> {
		return prisma.session.findFirst({
			where: {
				tokenHash: this.hashToken(rawRefreshToken),
				revokedAt: null,
				expiresAt: { gt: new Date() },
			},
		});
	}

	private generateRefreshToken(): string {
		return randomBytes(32).toString("base64url");
	}

	private hashToken(token: string): string {
		return createHash("sha256").update(token).digest("hex");
	}

	private getRefreshTokenExpiry(): Date {
		return new Date(Date.now() + parseDurationToMs(Env.JWT_REFRESH_EXPIRES_IN));
	}

	private serializeMetadata(
		metadata?: SessionMetadata
	): Prisma.InputJsonValue | undefined {
		if (!metadata) {
			return undefined;
		}

		const value: Record<string, string> = {};
		if (metadata.ip) value.ip = metadata.ip;
		if (metadata.userAgent) value.userAgent = metadata.userAgent;

		return Object.keys(value).length > 0 ? value : undefined;
	}
}
