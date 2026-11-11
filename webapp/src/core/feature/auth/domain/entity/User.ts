/**
 * Domain user identity returned by the authentication endpoints.
 * Role values match the backend users contract exactly.
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
