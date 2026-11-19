import type { AuthRepository } from '../repository/AuthRepository';
import type { EnsureAuthenticatedResult } from '../entity/User';
import { authSession } from '#core/infrastructure/auth/AuthSession.ts';
import { ApiError } from '#core/infrastructure/errors/ApiError.ts';

export class EnsureAuthenticatedUseCase {
	constructor(private readonly repository: AuthRepository) {}

	async execute(): Promise<EnsureAuthenticatedResult> {
		try {
			const user = await this.repository.getCurrentUser();
			if (!user.isActive) {
				authSession.clear();
				return {
					ok: false,
					reason: 'inactive',
					message: 'Usuario inactivo. Contacta al administrador.'
				};
			}
			return { ok: true, user };
		} catch (err) {
			if (err instanceof ApiError && err.isAuth) {
				authSession.clear();
				return {
					ok: false,
					reason: 'unauthorized',
					message: err.status === 403
						? 'No autorizado. Inicia sesión de nuevo.'
						: 'Sesión expirada o no válida'
				};
			}
			// A network/5xx failure must not erase a previously validated
			// in-memory identity. Flask remains authoritative on every request.
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
