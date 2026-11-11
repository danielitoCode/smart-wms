import type { ChangePasswordInput } from '../entity/User';
import type { AuthRepository } from '../repository/AuthRepository';

export class ChangePasswordUseCase {
	constructor(private readonly repository: AuthRepository) {}

	async execute(input: ChangePasswordInput): Promise<void> {
		if (!input.currentPassword) throw new Error('La contraseña actual es obligatoria');
		const password = input.newPassword ?? '';
		// Keep the backend validation order: the literal "admin" is rejected
		// before the minimum-length rule so both layers return the same reason.
		if (password.trim().toLowerCase() === 'admin') {
			throw new Error('La nueva contraseña no puede ser "admin"');
		}
		if (Array.from(password).length < 8) throw new Error('La nueva contraseña debe tener al menos 8 caracteres');
		await this.repository.changePassword(input);
	}
}
