import type { AuthRepository } from '../repository/AuthRepository';
import type { User } from '../entity/User';
import { authSession } from '../../../../infrastructure/auth/AuthSession';
import { ApiError } from '../../../../infrastructure/errors/ApiError';

export type EnsureAuthenticatedResult =
	| { ok: true; user: User }
	| { ok: false; reason: 'missing_token' | 'unauthorized' | 'unavailable'; message: string };

/**
 * Hardens the client guard: presence of a JWT is not enough.
 * Validates the session against GET /api/auth/me and, on 401,
 * attempts POST /api/auth/refresh once before clearing the session.
 */
export class EnsureAuthenticatedUseCase {
	constructor(private readonly repository: AuthRepository) {}

	async execute(): Promise<EnsureAuthenticatedResult> {
		if (!authSession.getToken()) {
			return {
				ok: false,
				reason: 'missing_token',
				message: 'No hay sesión activa'
			};
		}

		try {
			const user = await this.repository.getCurrentUser();
			return { ok: true, user };
		} catch (err) {
			if (this.isUnauthorized(err)) {
				return this.tryRefreshAndRecover();
			}
			return {
				ok: false,
				reason: 'unavailable',
				message: err instanceof Error ? err.message : 'No se pudo validar la sesión'
			};
		}
	}

	private async tryRefreshAndRecover(): Promise<EnsureAuthenticatedResult> {
		try {
			await this.repository.refreshToken();
			const user = await this.repository.getCurrentUser();
			return { ok: true, user };
		} catch {
			this.repository.logout();
			return {
				ok: false,
				reason: 'unauthorized',
				message: 'Sesión expirada o no válida'
			};
		}
	}

	private isUnauthorized(err: unknown): boolean {
		return err instanceof ApiError && (err.status === 401 || err.status === 403);
	}
}
