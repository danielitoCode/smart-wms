import type { AuthRepository } from '../repository/AuthRepository';
import type { User } from '../entity/User';
import { authSession } from '../../../../infrastructure/auth/AuthSession';
import { ApiError } from '../../../../infrastructure/errors/ApiError';

export type EnsureAuthenticatedResult =
	| { ok: true; user: User }
	| { ok: false; reason: 'unauthorized' | 'unavailable'; message: string };

/**
 * The HttpOnly cookie is intentionally not readable by the client.
 * Always validate it against GET /api/auth/me instead of treating local
 * storage or an in-memory flag as proof of authentication.
 */
export class EnsureAuthenticatedUseCase {
	constructor(private readonly repository: AuthRepository) {}

	async execute(): Promise<EnsureAuthenticatedResult> {
		try {
			const user = await this.repository.getCurrentUser();
			return { ok: true, user };
		} catch (err) {
			if (err instanceof ApiError && err.isUnauthorized) {
				authSession.clear();
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

	private describeUnavailable(err: unknown): string {
		if (err instanceof ApiError) {
			if (err.code === 'timeout') return 'Tiempo de espera agotado al validar la sesión';
			if (err.isNetwork) return 'No se pudo contactar al servidor de autenticación';
			return err.message || 'No se pudo validar la sesión';
		}
		return err instanceof Error ? err.message : 'No se pudo validar la sesión';
	}
}
