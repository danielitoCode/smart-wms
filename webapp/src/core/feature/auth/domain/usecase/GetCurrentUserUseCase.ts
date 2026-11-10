import type { AuthRepository } from '../repository/AuthRepository';
import type { User } from '../entity/User';

export class GetCurrentUserUseCase {
	constructor(private readonly repository: AuthRepository) {}

	execute(): Promise<User> {
		return this.repository.getCurrentUser();
	}
}
