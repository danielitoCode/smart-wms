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
