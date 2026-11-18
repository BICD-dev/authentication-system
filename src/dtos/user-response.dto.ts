import type { User } from "../generated/prisma/client";

/**
 * Public representation of a user. This is the only shape that should ever be
 * returned to clients; it deliberately excludes password and internal fields.
 */
export interface UserResponse {
	id: string;
	email: string | null;
	emailVerifiedAt: Date | null;
	firstName: string | null;
	lastName: string | null;
	avatar: string | null;
	status: User["status"];
	createdAt: Date;
}

export function toUserResponse(user: User): UserResponse {
	return {
		id: user.id,
		email: user.email,
		emailVerifiedAt: user.emailVerifiedAt,
		firstName: user.firstName,
		lastName: user.lastName,
		avatar: user.avatar,
		status: user.status,
		createdAt: user.createdAt,
	};
}
