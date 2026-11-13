import { createAuthDependencies } from '../../di/auth.dependencies';
import { resolveHomePath } from '../../domain/policy/AccessPolicy';
import type { User } from '../../domain/entity/User';

const deps = createAuthDependencies();

export type SplashOutcome =
	| { kind: 'home'; path: string; user: User }
	| { kind: 'login'; message?: string }
	| { kind: 'error'; message: string };

export type SplashStatus = 'idle' | 'checking' | 'done' | 'error';

/**
 * Estado del arranque visual: valida sesión y decide destino.
 * No navega; la pantalla consume el outcome y ejecuta goto.
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
					const path = resolveHomePath({
						role: result.user.role,
						allowedPages: result.user.allowedPages,
						mustChangePassword: result.user.mustChangePassword
					});
					outcome = { kind: 'home', path, user: result.user };
					status = 'done';
					return;
				}

				if (result.reason === 'unavailable') {
					outcome = {
						kind: 'error',
						message: result.message || 'No se pudo conectar con el servidor'
					};
					message = outcome.message;
					status = 'error';
					return;
				}

				// Sin sesión o token expirado → login
				outcome = {
					kind: 'login',
					message: result.message || undefined
				};
				status = 'done';
			} catch (err) {
				const text = err instanceof Error ? err.message : 'Error inesperado al validar sesión';
				outcome = { kind: 'error', message: text };
				message = text;
				status = 'error';
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
