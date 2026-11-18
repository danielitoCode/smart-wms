import type { ChangePasswordInput, Credentials, LoginResult, User } from '../entity/User';

export interface AuthRepository {
	login(credentials: Credentials): Promise<LoginResult>;
	getCurrentUser(): Promise<User>;
	refreshToken(): Promise<void>;
	logout(): Promise<void>;
	changePassword(input: ChangePasswordInput): Promise<void>;
}
