import { createAuthDependencies } from '../../di/auth.dependencies';
import type { User } from '../../domain/entity/User';
import { ApiError } from '../../../../infrastructure/errors/ApiError';

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
		get username() { return username; },
		get password() { return password; },
		get loading() { return loading; },
		get error() { return error; },
		get user() { return user; },
		setUsername(value: string) { username = value; },
		setPassword(value: string) { password = value; },
		submit
	};
}
