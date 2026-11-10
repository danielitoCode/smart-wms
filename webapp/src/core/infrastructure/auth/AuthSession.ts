/**
 * Client-side auth session holder.
 * Token is obtained via POST /api/auth/login and sent as Bearer on subsequent calls.
 * Backend contracts remain unchanged.
 */

export type AuthUser = {
	userId: number;
	username: string;
	fullName: string;
	role: string;
	warehouseIds: number[];
};

export type AuthSessionState = {
	token: string | null;
	user: AuthUser | null;
};

const STORAGE_KEY = 'smartwms.auth';

function readStored(): AuthSessionState {
	if (typeof localStorage === 'undefined') {
		return { token: null, user: null };
	}
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { token: null, user: null };
		const parsed = JSON.parse(raw) as AuthSessionState;
		return {
			token: parsed.token ?? null,
			user: parsed.user ?? null
		};
	} catch {
		return { token: null, user: null };
	}
}

let state: AuthSessionState = readStored();

function persist() {
	if (typeof localStorage === 'undefined') return;
	if (!state.token) {
		localStorage.removeItem(STORAGE_KEY);
		return;
	}
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const authSession = {
	getToken(): string | null {
		return state.token;
	},

	getUser(): AuthUser | null {
		return state.user;
	},

	isAuthenticated(): boolean {
		return Boolean(state.token);
	},

	setSession(token: string, user: AuthUser): void {
		state = { token, user };
		persist();
	},

	clear(): void {
		state = { token: null, user: null };
		persist();
	}
};
