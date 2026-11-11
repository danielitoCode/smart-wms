import { createAuthDependencies } from '../../di/auth.dependencies';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createAuthDependencies();

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
			// The backend invalidates the old JWT after a password change.
			// Logout clears the cookies where possible and always clears local state.
			try {
				await deps.logout.execute();
			} catch {
				// The password is already changed; the old token is invalid regardless.
			}
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo cambiar la contraseña');
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
