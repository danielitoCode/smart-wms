import type { AuthRepository } from '../repository/AuthRepository';

/**
 * Explicit refresh of the backend session (HttpOnly cookie / server token).
 * Used when a long-lived screen must renew authority without full re-login.
 */
export class RefreshSessionUseCase {
	constructor(private readonly repository: AuthRepository) {}

	execute(): Promise<void> {
		return this.repository.refreshToken();
	}
}
