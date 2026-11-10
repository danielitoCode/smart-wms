import type { Credentials, LoginResult, User } from '../entity/User';

/**
 * Domain port for authentication.
 * Backend: /api/auth/* — contracts unchanged.
 */
export interface AuthRepository {
	/** POST /api/auth/login */
	login(credentials: Credentials): Promise<LoginResult>;

	/** GET /api/auth/me */
	getCurrentUser(): Promise<User>;

	/** POST /api/auth/refresh */
	refreshToken(): Promise<string>;

	/** Clear local session (no backend call required). */
	logout(): void;
}
