import { createAuthDependencies } from '../../di/auth.dependencies';
import type { User } from '../../domain/entity/User';
import { ApiError } from '#core/infrastructure/errors/ApiError.ts';

const deps = createAuthDependencies();

function loginErrorMessage(err: unknown): string {
	if (err instanceof ApiError) {
		if (err.isNetwork) return err.code === 'timeout'
			? 'Tiempo de espera agotado. Inténtalo de nuevo.'
			: 'No se pudo conectar con el servidor.';
		if (err.status === 401) return 'Usuario o contraseña incorrectos.';
		if (err.status === 429) return 'Demasiados intentos de inicio de sesión. Espera unos minutos y vuelve a intentarlo.';
	}
	return 'No se pudo iniciar sesión. Comprueba tus datos e inténtalo de nuevo.';
}

/**
 * Login form state (Svelte 5 runes).
 *
 * username/password MUST expose both get and set so `bind:value={state.username}`
 * can write back into the $state. Getter-only properties leave the DOM filled
 * while the internal rune stays empty → false "Usuario requerido".
 */
export function createLoginState() {
	let username = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let user = $state<User | null>(null);

	async function submit(): Promise<boolean> {
		if (loading) return false;
		const userName = username.trim();
		if (!userName) {
			error = 'Usuario requerido';
			return false;
		}
		if (!password) {
			error = 'Contraseña requerida';
			return false;
		}

		loading = true;
		error = null;
		try {
			const result = await deps.login.execute({ username: userName, password });
			user = result.user;
			password = '';
			return true;
		} catch (err) {
			password = '';
			error = loginErrorMessage(err);
			return false;
		} finally {
			loading = false;
		}
	}

	return {
		get username() {
			return username;
		},
		set username(value: string) {
			username = value;
		},
		get password() {
			return password;
		},
		set password(value: string) {
			password = value;
		},
		get loading() {
			return loading;
		},
		/** Alias used by LoginScreen (`state.submitting`). */
		get submitting() {
			return loading;
		},
		get error() {
			return error;
		},
		get user() {
			return user;
		},
		submit
	};
}
