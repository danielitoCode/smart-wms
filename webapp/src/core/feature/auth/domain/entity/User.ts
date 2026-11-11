/**
 * Domain user identity returned by /api/auth/login and /api/auth/me.
 * Role and permission values mirror the backend contract.
 */
export type UserRole = 'ADMIN' | 'USER';

export type User = {
	userId: number;
	username: string;
	fullName: string;
	role: UserRole;
	warehouseId: number | null;
	warehouseIds: number[];
	allowedFunctions: string[];
	allowedPages: string[];
	allowedOverrides: string[];
	isActive: boolean;
	requirePacking: boolean;
	mustChangePassword: boolean;
};

export type Credentials = {
	username: string;
	password: string;
};

export type LoginResult = {
	user: User;
};
