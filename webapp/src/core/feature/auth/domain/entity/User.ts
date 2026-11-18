export type UserRole = 'ADMIN' | 'USER' | 'SALES' | 'OPERATOR' | 'AUDIT';

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

export type Credentials = { username: string; password: string };
export type LoginResult = { user: User };
export type ChangePasswordInput = { currentPassword: string; newPassword: string };

/**
 * Domain outcomes for session validation.
 * HttpOnly cookie stays backend authority; this only models client decisions.
 */
export type AuthFailureReason =
	| 'invalid_session'
	| 'inactive_user'
	| 'insufficient_permission'
	| 'must_change_password'
	| 'unavailable';

export type EnsureAuthenticatedResult =
	| { ok: true; user: User }
	| { ok: false; reason: 'unauthorized' | 'unavailable' | 'inactive'; message: string };
