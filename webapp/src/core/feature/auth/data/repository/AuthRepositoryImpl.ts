import type { AuthRepository } from '../../domain/repository/AuthRepository';
import type { ChangePasswordInput, Credentials, LoginResult, User } from '../../domain/entity/User';
import type { AuthRemoteDataSource } from '../datasource/AuthRemoteDataSource';
import { AuthMapper } from '../mapper/AuthMapper';
import { authSession } from '#core/infrastructure/auth/AuthSession.ts';

export class AuthRepositoryImpl implements AuthRepository {
	private sessionEpoch = 0;

	constructor(private readonly datasource: AuthRemoteDataSource) {}

	async login(credentials: Credentials): Promise<LoginResult> {
		const epoch = ++this.sessionEpoch;
		// /login returns the account profile but not the web page/override grants.
		// Load /me immediately so the first route decision uses the same complete,
		// current authorization snapshot as a cold application bootstrap.
		await this.datasource.login(credentials.username, credentials.password);
		const user = AuthMapper.toUser(await this.datasource.me());
		if (epoch !== this.sessionEpoch) throw new Error('La sesión cambió durante el inicio de sesión.');
		this.storeSessionUser(user);
		return { user };
	}

	async getCurrentUser(): Promise<User> {
		const epoch = this.sessionEpoch;
		const user = AuthMapper.toUser(await this.datasource.me());
		if (epoch !== this.sessionEpoch) throw new Error('La sesión cambió durante la validación.');
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
			allowedOverrides: user.allowedOverrides,
			mustChangePassword: user.mustChangePassword
		});
	}

	async refreshToken(): Promise<void> {
		await this.datasource.refresh();
	}

	async logout(): Promise<void> {
		this.sessionEpoch += 1;
		authSession.clear();
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
