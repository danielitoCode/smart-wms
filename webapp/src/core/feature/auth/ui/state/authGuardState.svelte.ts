import { createAuthDependencies } from '../../di/auth.dependencies';
import type { User } from '../../domain/entity/User';
import type { EnsureAuthenticatedResult } from '../../domain/usecase/EnsureAuthenticatedUseCase';

const deps = createAuthDependencies();

export type AuthGuardStatus = 'checking' | 'authenticated' | 'anonymous' | 'error';

/**
 * UI state for the protected (app) layout.
 * Never treats a stored JWT as proof of auth without EnsureAuthenticatedUseCase.
 * Concurrent verify() calls share a single in-flight promise.
 */
export function createAuthGuardState() {
	let status = $state<AuthGuardStatus>('checking');
	let user = $state<User | null>(null);
	let message = $state<string | null>(null);
	let inFlight: Promise<void> | null = null;

	async function verify() {
		if (inFlight) return inFlight;

		inFlight = (async () => {
			status = 'checking';
			message = null;

			try {
				const result: EnsureAuthenticatedResult = await deps.ensureAuthenticated.execute();

				if (result.ok) {
					user = result.user;
					status = 'authenticated';
					return;
				}

				user = null;
				message = result.message;

				if (result.reason === 'unavailable') {
					status = 'error';
					return;
				}

				status = 'anonymous';
			} catch (err) {
				user = null;
				message = err instanceof Error ? err.message : 'Error inesperado al validar sesión';
				status = 'error';
			}
		})();

		try {
			await inFlight;
		} finally {
			inFlight = null;
		}
	}

	function logout() {
		deps.logout.execute();
		user = null;
		status = 'anonymous';
		message = null;
	}

	return {
		get status() {
			return status;
		},
		get user() {
			return user;
		},
		get message() {
			return message;
		},
		verify,
		logout
	};
}
