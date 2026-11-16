import { createAuthDependencies } from '../../di/auth.dependencies';
import { resolveHomePath } from '../../domain/policy/AccessPolicy';
import type { User } from '../../domain/entity/User';
import { authSession } from '#core/infrastructure/auth/AuthSession.ts';

const deps = createAuthDependencies();

export type SplashOutcome =
	| { kind: 'home'; path: string; user: User }
	| { kind: 'login'; message?: string }
	| { kind: 'error'; message: string };

export type SplashStatus = 'idle' | 'checking' | 'done' | 'error';

/**
 * Arranque visual: valida sesión y decide destino.
 * Sin sesión / token inválido / backend inalcanzable en frío → login (limpio).
 * No navega; SplashScreen consume outcome y hace goto.
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

				// Estricto: sin sesión válida → limpiar y mandar a login.
				// Incluye unauthorized, inactive y unavailable (arranque en frío sin cookie / sin API).
				authSession.clear();
				outcome = {
					kind: 'login',
					message: result.message || undefined
				};
				status = 'done';
			} catch (err) {
				authSession.clear();
				// Errores inesperados: aún así preferimos login en arranque en frío
				// para no dejar al usuario atrapado en el splash.
				outcome = {
					kind: 'login',
					message: err instanceof Error ? err.message : undefined
				};
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
