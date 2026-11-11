/**
 * In-memory view of the authenticated user.
 * The credential remains in the backend's HttpOnly cookie.
 */
export type AuthUser = {
	userId: number;
	username: string;
	fullName: string;
	role: string;
	warehouseIds: number[];
	allowedPages: string[];
	allowedFunctions: string[];
	mustChangePassword: boolean;
};

export type AuthSessionState = { user: AuthUser | null };
let state: AuthSessionState = { user: null };

export const authSession = {
	getUser(): AuthUser | null {
		return state.user;
	},
	isAuthenticated(): boolean {
		return state.user !== null;
	},
	setUser(user: AuthUser): void {
		state = { user };
	},
	clear(): void {
		state = { user: null };
	}
};
