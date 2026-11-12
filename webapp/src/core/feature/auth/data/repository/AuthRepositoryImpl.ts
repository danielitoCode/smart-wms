import type { AuthRepository } from '../../domain/repository/AuthRepository';
import type { ChangePasswordInput, Credentials, LoginResult, User } from '../../domain/entity/User';
import type { AuthRemoteDataSource } from '../datasource/AuthRemoteDataSource';
import { AuthMapper } from '../mapper/AuthMapper';
import { authSession } from '#core/infrastructure/auth/AuthSession.ts';

export class AuthRepositoryImpl implements AuthRepository {
	constructor(private readonly datasource: AuthRemoteDataSource) {}

	async login(credentials: Credentials): Promise<LoginResult> {
		const response = await this.datasource.login(credentials.username, credentials.password);
		const user = AuthMapper.toUser(response.user);
		this.storeSessionUser(user);
		return { user };
	}

	async getCurrentUser(): Promise<User> {
		const user = AuthMapper.toUser(await this.datasource.me());
		this.storeSessionUser(user);
		return user;
	}

	private storeSessionUser(user: User): void {
		authSession.setUser({
			userId: user.userId,
			username: user.username,
			fullName: user.fullName,
			role: user.role,
			warehouseIds: user.warehouseIds,
			allowedPages: user.allowedPages,
			allowedFunctions: user.allowedFunctions,
			mustChangePassword: user.mustChangePassword
		});
	}

	async refreshToken(): Promise<void> {
		await this.datasource.refresh();
	}

	async logout(): Promise<void> {
		try {
			await this.datasource.logout();
		} finally {
			authSession.clear();
		}
	}

	async changePassword(input: ChangePasswordInput): Promise<void> {
		await this.datasource.changePassword({
			current_password: input.currentPassword,
			new_password: input.newPassword
		});
	}
}
