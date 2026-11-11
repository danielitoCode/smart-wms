import type { AuthRepository } from '../../domain/repository/AuthRepository';
import type { Credentials, LoginResult, User } from '../../domain/entity/User';
import type { AuthRemoteDataSource } from '../datasource/AuthRemoteDataSource';
import { AuthMapper } from '../mapper/AuthMapper';
import { authSession } from '../../../../infrastructure/auth/AuthSession';

export class AuthRepositoryImpl implements AuthRepository {
	constructor(private readonly datasource: AuthRemoteDataSource) {}

	async login(credentials: Credentials): Promise<LoginResult> {
		const dto = await this.datasource.login(credentials.username, credentials.password);
		const user = AuthMapper.toUser(dto.user);
		authSession.setUser({
			userId: user.userId,
			username: user.username,
			fullName: user.fullName,
			role: user.role,
			warehouseIds: user.warehouseIds
		});
		return { user };
	}

	async getCurrentUser(): Promise<User> {
		const dto = await this.datasource.me();
		const user = AuthMapper.toUser(dto);
		authSession.setUser({
			userId: user.userId,
			username: user.username,
			fullName: user.fullName,
			role: user.role,
			warehouseIds: user.warehouseIds
		});
		return user;
	}

	async refreshToken(): Promise<void> {
		// The backend rotates the HttpOnly cookie as a side effect.
		await this.datasource.refresh();
	}

	async logout(): Promise<void> {
		try {
			await this.datasource.logout();
		} finally {
			authSession.clear();
		}
	}
}
