import { createAuthDependencies } from '../../di/auth.dependencies';
import type { User } from '../../domain/entity/User';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createAuthDependencies();

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
			error = 'Contrase\u00f1a requerida';
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
			error = toUserMessage(err, 'No se pudo iniciar sesi\u00f3n');
			return false;
		} finally {
			loading = false;
		}
	}

	function setUsername(value: string) {
		username = value;
	}

	function setPassword(value: string) {
		password = value;
	}

	return {
		get username() {
			return username;
		},
		get password() {
			return password;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		get user() {
			return user;
		},
		setUsername,
		setPassword,
		submit
	};
}
