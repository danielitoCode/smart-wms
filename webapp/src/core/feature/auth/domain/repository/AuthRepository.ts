import type { ChangePasswordInput, Credentials, LoginResult, User } from '../entity/User';

export type LogoutResult =
	| { confirmed: true }
	| { confirmed: false; reason: 'remote-unavailable' };

export interface AuthRepository {
	login(credentials: Credentials): Promise<LoginResult>;
	getCurrentUser(): Promise<User>;
	refreshToken(): Promise<void>;
	logout(): Promise<LogoutResult>;
	changePassword(input: ChangePasswordInput): Promise<void>;
}
