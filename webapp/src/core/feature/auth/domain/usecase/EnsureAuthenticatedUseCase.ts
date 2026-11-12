import type { AuthRepository } from '../repository/AuthRepository';
import type { User } from '../entity/User';
import { authSession } from '#core/infrastructure/auth/AuthSession.ts';
import { ApiError } from '#core/infrastructure/errors/ApiError.ts';

export type EnsureAuthenticatedResult =
	| { ok: true; user: User }
	| { ok: false; reason: 'unauthorized' | 'unavailable'; message: string };

export class EnsureAuthenticatedUseCase {
	constructor(private readonly repository: AuthRepository) {}

	async execute(): Promise<EnsureAuthenticatedResult> {
		try {
			const user = await this.repository.getCurrentUser();
			return { ok: true, user };
		} catch (err) {
			// A 403 may represent a policy/permission rejection, not a missing session.
			if (err instanceof ApiError && err.status === 401) {
				authSession.clear();
				return { ok: false, reason: 'unauthorized', message: 'Sesión expirada o no válida' };
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
			return 'No se pudo validar la sesión';
		}
		return 'No se pudo validar la sesión';
	}
}
