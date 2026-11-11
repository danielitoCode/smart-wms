/**
 * In-memory view of the authenticated user.
 *
 * The browser credential itself is held only in the backend's HttpOnly
 * sentry_auth cookie. It is never copied into JavaScript or localStorage.
 * The session is rehydrated from GET /api/auth/me after every page load.
 */
export type AuthUser = {
	userId: number;
	username: string;
	fullName: string;
	role: string;
	warehouseIds: number[];
};

export type AuthSessionState = {
	user: AuthUser | null;
};

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
