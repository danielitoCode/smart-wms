import type { AuthRepository } from '../repository/AuthRepository';
import type { User } from '../entity/User';
import { authSession } from '../../../../infrastructure/auth/AuthSession';
import { ApiError } from '../../../../infrastructure/errors/ApiError';

export type EnsureAuthenticatedResult =
	| { ok: true; user: User }
	| { ok: false; reason: 'missing_token' | 'unauthorized' | 'unavailable'; message: string };

/**
 * Hardens the client guard: presence of a JWT is not enough.
 * Validates the session against GET /api/auth/me and, on 401/403,
 * attempts POST /api/auth/refresh once before clearing the session.
 *
 * Network / timeout / 5xx never clear the stored token (unavailable).
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
				message: this.describeUnavailable(err)
			};
		}
	}

	private async tryRefreshAndRecover(): Promise<EnsureAuthenticatedResult> {
		try {
			await this.repository.refreshToken();
			const user = await this.repository.getCurrentUser();
			return { ok: true, user };
		} catch (err) {
			if (this.isUnauthorized(err)) {
				this.repository.logout();
				return {
					ok: false,
					reason: 'unauthorized',
					message: 'Sesión expirada o no válida'
				};
			}

			return {
				ok: false,
				reason: 'unavailable',
				message: this.describeUnavailable(err)
			};
		}
	}

	private isUnauthorized(err: unknown): boolean {
		return err instanceof ApiError && err.isUnauthorized;
	}

	private describeUnavailable(err: unknown): string {
		if (err instanceof ApiError) {
			if (err.code === 'timeout') return 'Tiempo de espera agotado al validar la sesión';
			if (err.isNetwork) return 'No se pudo contactar al servidor de autenticación';
			return err.message || 'No se pudo validar la sesión';
		}
		return err instanceof Error ? err.message : 'No se pudo validar la sesión';
	}
}
