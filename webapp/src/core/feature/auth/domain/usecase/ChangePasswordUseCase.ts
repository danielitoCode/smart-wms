import type { ChangePasswordInput } from '../entity/User';
import type { AuthRepository } from '../repository/AuthRepository';

export class ChangePasswordUseCase {
	constructor(private readonly repository: AuthRepository) {}

	async execute(input: ChangePasswordInput): Promise<void> {
		if (!input.currentPassword) throw new Error('La contraseña actual es obligatoria');
		const password = input.newPassword ?? '';
		if (password.length < 8) throw new Error('La nueva contraseña debe tener al menos 8 caracteres');
		if (!/[A-Za-z]/.test(password)) throw new Error('La nueva contraseña debe contener al menos una letra');
		if (!/[0-9]/.test(password)) throw new Error('La nueva contraseña debe contener al menos un número');
		if (password.trim().toLowerCase() === 'admin') {
			throw new Error('La nueva contraseña no puede ser "admin"');
		}
		await this.repository.changePassword(input);
	}
}
