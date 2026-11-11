import type { AuthRepository } from '../repository/AuthRepository';
import type { Credentials, LoginResult } from '../entity/User';

export class LoginUseCase {
	constructor(private readonly repository: AuthRepository) {}

	async execute(credentials: Credentials): Promise<LoginResult> {
		const username = credentials.username?.trim() ?? '';
		const password = credentials.password ?? '';
		if (!username) throw new Error('username is required');
		if (!password) throw new Error('password is required');
		return this.repository.login({ username, password });
	}
}
