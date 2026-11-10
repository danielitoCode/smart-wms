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

		authSession.setSession(dto.token, {
			userId: user.userId,
			username: user.username,
			fullName: user.fullName,
			role: user.role,
			warehouseIds: user.warehouseIds
		});

		return { token: dto.token, user };
	}

	async getCurrentUser(): Promise<User> {
		const dto = await this.datasource.me();
		const user = AuthMapper.toUser(dto);

		const token = authSession.getToken();
		if (token) {
			authSession.setSession(token, {
				userId: user.userId,
				username: user.username,
				fullName: user.fullName,
				role: user.role,
				warehouseIds: user.warehouseIds
			});
		}

		return user;
	}

	async refreshToken(): Promise<string> {
		const dto = await this.datasource.refresh();
		const current = authSession.getUser();
		if (current) {
			authSession.setSession(dto.token, current);
		} else {
			authSession.setSession(dto.token, {
				userId: 0,
				username: '',
				fullName: '',
				role: '',
				warehouseIds: []
			});
		}
		return dto.token;
	}

	logout(): void {
		authSession.clear();
	}
}
