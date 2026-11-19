import { createAuthDependencies } from '../../di/auth.dependencies';
import { resolveHomePath } from '../../domain/policy/AccessPolicy';
import type { User } from '../../domain/entity/User';
import { authSession } from '#core/infrastructure/auth/AuthSession.ts';
import { authBootHint } from '#core/infrastructure/auth/AuthBootHint.ts';

const deps = createAuthDependencies();

export type SplashOutcome =
	| { kind: 'home'; path: string; user: User }
	| { kind: 'login'; message?: string }
	| { kind: 'landing' }
	| { kind: 'error'; message: string };

export type SplashStatus = 'idle' | 'checking' | 'done' | 'error';

/**
 * Arranque en `/`:
 * - Sesión válida → vistas internas (home)
 * - Sesión inactiva o expirada (tras login previo) → login
 * - Sin sesión y sin historial de login en este navegador → landing
 * - Backend inalcanzable en frío anónimo → landing; si hubo sesión conocida → login con aviso
 */
export function createSplashState() {
	let status = $state<SplashStatus>('idle');
	let outcome = $state<SplashOutcome | null>(null);
	let message = $state<string | null>(null);
	let inFlight: Promise<void> | null = null;

	async function bootstrap() {
		if (inFlight) return inFlight;
		inFlight = (async () => {
			status = 'checking';
			message = null;
			outcome = null;
			try {
				const result = await deps.ensureAuthenticated.execute();
				if (result.ok) {
					authBootHint.markKnown();
					const path = resolveHomePath({
						role: result.user.role,
						allowedPages: result.user.allowedPages,
						mustChangePassword: result.user.mustChangePassword
					});
					outcome = { kind: 'home', path, user: result.user };
					status = 'done';
					return;
				}

				const known = authBootHint.hasKnownSession();

				if (result.reason === 'inactive') {
					authSession.clear();
					outcome = {
						kind: 'login',
						message: result.message || 'Usuario inactivo. Contacta al administrador.'
					};
					status = 'done';
					return;
				}

				if (result.reason === 'unauthorized') {
					authSession.clear();
					if (known) {
						// Cookie ausente o expirada tras haber iniciado sesión antes → login
						outcome = {
							kind: 'login',
							message: result.message || 'Sesión expirada o no válida'
						};
					} else {
						// Frío anónimo: sin sesión y sin historial → landing
						outcome = { kind: 'landing' };
					}
					status = 'done';
					return;
				}

				// unavailable (red / 5xx): no borrar hint; decidir con contexto
				if (known) {
					outcome = {
						kind: 'login',
						message: result.message || 'No se pudo validar la sesión'
					};
				} else {
					outcome = { kind: 'landing' };
				}
				status = 'done';
			} catch (err) {
				authSession.clear();
				const known = authBootHint.hasKnownSession();
				if (known) {
					outcome = {
						kind: 'login',
						message: err instanceof Error ? err.message : 'No se pudo validar la sesión'
					};
				} else {
					outcome = { kind: 'landing' };
				}
				status = 'done';
			}
		})();

		try {
			await inFlight;
		} finally {
			inFlight = null;
		}
	}

	return {
		get status() {
			return status;
		},
		get outcome() {
			return outcome;
		},
		get message() {
			return message;
		},
		bootstrap
	};
}
