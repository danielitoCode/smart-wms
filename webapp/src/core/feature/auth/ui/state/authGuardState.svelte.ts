import { createAuthDependencies } from '../../di/auth.dependencies';
import type { User, EnsureAuthenticatedResult } from '../../domain/entity/User';
import type { LogoutResult } from '../../domain/repository/AuthRepository';
import { authBootHint } from '#core/infrastructure/auth/AuthBootHint.ts';

const deps = createAuthDependencies();

export type AuthGuardStatus =
	| 'checking'
	| 'authenticated'
	| 'anonymous'
	| 'unavailable'
	| 'logout-unconfirmed';

export function createAuthGuardState() {
	let status = $state<AuthGuardStatus>('checking');
	let user = $state<User | null>(null);
	let message = $state<string | null>(null);
	let inFlight: Promise<void> | null = null;
	let revalidateInFlight: Promise<void> | null = null;

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
					authBootHint.markKnown();
					return;
				}
				user = null;
				message = result.message;
				status = result.reason === 'unavailable' ? 'unavailable' : 'anonymous';
			} catch (err) {
				user = null;
				message = err instanceof Error ? err.message : 'Error inesperado al validar sesión';
				status = 'unavailable';
			}
		})();
		try {
			await inFlight;
		} finally {
			inFlight = null;
		}
	}

	/**
	 * Soft refresh of grants via /me.
	 * Used on internal navigation so revoked page keys take effect without full boot flash.
	 * Network failures keep the previous in-memory user (Flask still enforces 403).
	 */
	async function revalidatePermissions() {
		if (status !== 'authenticated') return;
		if (revalidateInFlight) return revalidateInFlight;
		revalidateInFlight = (async () => {
			try {
				const result: EnsureAuthenticatedResult = await deps.ensureAuthenticated.execute();
				if (result.ok) {
					user = result.user;
					status = 'authenticated';
					message = null;
					return;
				}
				if (result.reason === 'unauthorized' || result.reason === 'inactive') {
					user = null;
					message = result.message;
					status = 'anonymous';
					return;
				}
				message = result.message;
			} catch {
				// keep previous session snapshot
			}
		})();
		try {
			await revalidateInFlight;
		} finally {
			revalidateInFlight = null;
		}
	}

	async function logout(): Promise<LogoutResult> {
		let result: LogoutResult;
		try {
			result = await deps.logout.execute();
		} catch {
			// Defensive fallback: repository normally converts remote failures to a result.
			result = { confirmed: false, reason: 'remote-unavailable' };
		} finally {
			user = null;
			// Keep the state explicit until the shell has routed to the login screen.
			message = null;
			authBootHint.clear();
		}
		status = result.confirmed ? 'anonymous' : 'logout-unconfirmed';
		if (!result.confirmed) {
			message = 'No se pudo confirmar el cierre de sesión en el servidor. La sesión remota podría seguir activa.';
		}
		return result;
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
		revalidatePermissions,
		logout
	};
}
