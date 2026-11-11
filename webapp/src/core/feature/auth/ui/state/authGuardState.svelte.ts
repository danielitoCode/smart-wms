import { createAuthDependencies } from '../../di/auth.dependencies';
import type { User } from '../../domain/entity/User';
import type { EnsureAuthenticatedResult } from '../../domain/usecase/EnsureAuthenticatedUseCase';

const deps = createAuthDependencies();

export type AuthGuardStatus = 'checking' | 'authenticated' | 'anonymous' | 'error';

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
				status = result.reason === 'unavailable' ? 'error' : 'anonymous';
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

	async function logout() {
		try {
			await deps.logout.execute();
		} catch {
			// Local state is cleared by the repository even if the server is unavailable.
		} finally {
			user = null;
			status = 'anonymous';
			message = null;
		}
	}

	return {
		get status() { return status; },
		get user() { return user; },
		get message() { return message; },
		verify,
		logout
	};
}
