/**
 * Domain user identity from SentryWMS auth surface.
 * Mirrors fields returned by POST /api/auth/login and GET /api/auth/me.
 */
export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'OPERATOR' | string;

export type User = {
	userId: number;
	username: string;
	fullName: string;
	role: UserRole;
	warehouseId: number | null;
	warehouseIds: number[];
	allowedFunctions: string[];
	isActive: boolean;
	requirePacking: boolean;
};

export type Credentials = {
	username: string;
	password: string;
};

export type AuthToken = {
	token: string;
};

export type LoginResult = {
	token: string;
	user: User;
};
