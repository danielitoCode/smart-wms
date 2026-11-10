import type { AuthRepository } from '../repository/AuthRepository';

export class LogoutUseCase {
	constructor(private readonly repository: AuthRepository) {}

	execute(): void {
		this.repository.logout();
	}
}
