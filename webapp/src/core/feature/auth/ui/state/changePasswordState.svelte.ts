import { createAuthDependencies } from '../../di/auth.dependencies';
import { ApiError } from '../../../../infrastructure/errors/ApiError';

const deps = createAuthDependencies();

function changePasswordErrorMessage(err: unknown): string {
	if (err instanceof ApiError) {
		if (err.isNetwork) return 'No se pudo conectar con el servidor. Comprueba la conexión e inténtalo de nuevo.';
		if (err.status === 403) return 'La contraseña actual no es correcta o la sesión no tiene autorización.';
		if (err.status === 400) {
			const known: Record<string, string> = {
				"Password cannot be 'admin'": 'La contraseña no puede ser «admin».',
				'Password must be at least 8 characters': 'La contraseña debe tener al menos 8 caracteres.',
				'Password must contain at least one letter': 'La contraseña debe contener al menos una letra.',
				'Password must contain at least one digit': 'La contraseña debe contener al menos un número.'
			};
			return known[err.message] ?? 'La nueva contraseña no cumple los requisitos.';
		}
	}
	return err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.';
}

export function createChangePasswordState() {
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);

	async function submit(): Promise<boolean> {
		if (submitting) return false;
		error = null;
		if (newPassword !== confirmPassword) {
			error = 'La confirmación no coincide con la nueva contraseña';
			return false;
		}
		submitting = true;
		try {
			await deps.changePassword.execute({ currentPassword, newPassword });
			try {
				await deps.logout.execute();
			} catch {
				// Password change invalidates the old token; local session is cleared in finally.
			}
			return true;
		} catch (err) {
			error = changePasswordErrorMessage(err);
			return false;
		} finally {
			submitting = false;
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
		}
	}

	return {
		get currentPassword() { return currentPassword; },
		get newPassword() { return newPassword; },
		get confirmPassword() { return confirmPassword; },
		get submitting() { return submitting; },
		get error() { return error; },
		setCurrentPassword(value: string) { currentPassword = value; },
		setNewPassword(value: string) { newPassword = value; },
		setConfirmPassword(value: string) { confirmPassword = value; },
		submit
	};
}
