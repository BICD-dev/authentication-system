import { createHash, randomBytes } from "crypto";
import { Env } from "../config/env";
import type { Prisma, Session } from "../generated/prisma/client";
import { SessionRepository } from "../repositories/session.repository";
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

	private readonly sessionRepository: SessionRepository;

	constructor() {
		this.sessionRepository = new SessionRepository();
	}

	/**
	 * Create a new refresh-token session. Only the SHA-256 hash of the token is
	 * persisted; the raw token is returned to the caller exactly once.
	 */
	async createSession(
		userId: string,
		metadata?: SessionMetadata
	): Promise<IssuedSession> {
		const refreshToken = this.generateRefreshToken();

		const session = await this.sessionRepository.create({
			userId,
			tokenHash: this.hashToken(refreshToken),
			expiresAt: this.getRefreshTokenExpiry(),
			metadata: this.serializeMetadata(metadata),
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
		const session = await this.sessionRepository.findByTokenHash(tokenHash);

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
			await this.sessionRepository.revoke(session.id);
			throw new AppError(401, "Refresh token expired. Please sign in again.");
		}

		// Guard against two concurrent refreshes using the same token. Only one
		// request can transition the session from active to revoked.
		const revoked = await this.sessionRepository.revoke(session.id);

		if (!revoked) {
			await this.revokeAllSessionsForUser(session.userId);
			throw new AppError(
				401,
				"Refresh token reuse detected. Please sign in again."
			);
		}

		const refreshToken = this.generateRefreshToken();
		const newSession = await this.sessionRepository.create({
			userId: session.userId,
			tokenHash: this.hashToken(refreshToken),
			expiresAt: this.getRefreshTokenExpiry(),
			metadata: this.serializeMetadata(metadata),
		});

		return { refreshToken, session: newSession };
	}

	async revokeSession(rawRefreshToken: string): Promise<boolean> {
		return this.sessionRepository.revokeByTokenHash(
			this.hashToken(rawRefreshToken)
		);
	}

	async revokeAllSessionsForUser(userId: string): Promise<number> {
		return this.sessionRepository.revokeAllForUser(userId);
	}

	async findActiveSession(rawRefreshToken: string): Promise<Session | null> {
		return this.sessionRepository.findActiveByTokenHash(
			this.hashToken(rawRefreshToken)
		);
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
