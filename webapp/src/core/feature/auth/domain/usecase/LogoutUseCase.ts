import type { AuthRepository, LogoutResult } from '../repository/AuthRepository';

export class LogoutUseCase {
	constructor(private readonly repository: AuthRepository) {}

	execute(): Promise<LogoutResult> {
		return this.repository.logout();
	}
}
