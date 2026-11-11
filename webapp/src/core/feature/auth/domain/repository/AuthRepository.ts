import type { Credentials, LoginResult, User } from '../entity/User';

/** Domain port for browser authentication through the backend cookie session. */
export interface AuthRepository {
	login(credentials: Credentials): Promise<LoginResult>;
	getCurrentUser(): Promise<User>;
	/** Rotates the backend cookie while the current session is still valid. */
	refreshToken(): Promise<void>;
	/** Revokes the browser session by asking the backend to clear its cookies. */
	logout(): Promise<void>;
}
