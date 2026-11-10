import { createAuthDependencies } from '../../di/auth.dependencies';
import type { User } from '../../domain/entity/User';
import type { EnsureAuthenticatedResult } from '../../domain/usecase/EnsureAuthenticatedUseCase';

const deps = createAuthDependencies();

export type AuthGuardStatus = 'checking' | 'authenticated' | 'anonymous' | 'error';

/**
 * UI state for the protected (app) layout.
 * Never treats a stored JWT as proof of auth without EnsureAuthenticatedUseCase.
 */
export function createAuthGuardState() {
	let status = $state<AuthGuardStatus>('checking');
	let user = $state<User | null>(null);
	let message = $state<string | null>(null);

	async function verify() {
		status = 'checking';
		message = null;

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
