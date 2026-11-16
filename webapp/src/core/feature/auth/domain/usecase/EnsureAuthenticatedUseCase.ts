import type { AuthRepository } from '../repository/AuthRepository';
import type { EnsureAuthenticatedResult, User } from '../entity/User';
import { authSession } from '#core/infrastructure/auth/AuthSession.ts';
import { ApiError } from '#core/infrastructure/errors/ApiError.ts';

export class EnsureAuthenticatedUseCase {
	constructor(private readonly repository: AuthRepository) {}

	async execute(): Promise<EnsureAuthenticatedResult> {
		try {
			const user = await this.loadUserWithOptionalRefresh();
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
			// Tokens / cookie inválidos: limpia siempre y trata como no autenticado
			if (err instanceof ApiError && (err.status === 401 || err.status === 403 || err.isUnauthorized)) {
				authSession.clear();
				return {
					ok: false,
					reason: 'unauthorized',
					message: err.status === 403
						? 'No autorizado. Inicia sesión de nuevo.'
						: 'Sesión expirada o no válida'
				};
			}
			// Red / timeout: no borra sesión en memoria (revalidate soft en app),
			// el splash decidirá redirigir a login si no hay usuario en memoria.
			return {
				ok: false,
				reason: 'unavailable',
				message: this.describeUnavailable(err)
			};
		}
	}

	/**
	 * 1) /me
	 * 2) on 401 → refresh once → /me again
	 * Network/5xx leave in-memory user intact (caller sees unavailable).
	 */
	private async loadUserWithOptionalRefresh(): Promise<User> {
		try {
			return await this.repository.getCurrentUser();
		} catch (err) {
			if (!(err instanceof ApiError) || err.status !== 401) throw err;
			try {
				await this.repository.refreshToken();
			} catch (refreshErr) {
				if (refreshErr instanceof ApiError && refreshErr.status === 401) throw refreshErr;
				if (refreshErr instanceof ApiError && (refreshErr.isNetwork || refreshErr.code === 'timeout')) {
					throw refreshErr;
				}
				throw err;
			}
			return await this.repository.getCurrentUser();
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
