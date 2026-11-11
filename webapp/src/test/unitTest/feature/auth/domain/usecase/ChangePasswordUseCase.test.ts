import { describe, it, expect, vi } from 'vitest';
import { ChangePasswordUseCase } from '../../../../../../core/feature/auth/domain/usecase/ChangePasswordUseCase';
import type { AuthRepository } from '../../../../../../core/feature/auth/domain/repository/AuthRepository';

describe('ChangePasswordUseCase', () => {
	const repository = () => ({
		login: vi.fn(), getCurrentUser: vi.fn(), refreshToken: vi.fn(),
		logout: vi.fn(), changePassword: vi.fn().mockResolvedValue(undefined)
	});

	it('rejects passwords that do not meet backend policy', async () => {
		const repo = repository();
		const useCase = new ChangePasswordUseCase(repo);
		await expect(useCase.execute({ currentPassword: 'old', newPassword: 'admin' })).rejects.toThrow(/admin/);
		await expect(useCase.execute({ currentPassword: 'old', newPassword: 'short' })).rejects.toThrow(/8 caracteres/);
		await expect(useCase.execute({ currentPassword: 'old', newPassword: 'onlyletters' })).rejects.toThrow(/número/);
		expect(repo.changePassword).not.toHaveBeenCalled();
	});

	it('accepts Unicode letters and decimal digits like the backend policy', async () => {
		const repo = repository();
		await new ChangePasswordUseCase(repo).execute({ currentPassword: 'old', newPassword: 'contraseña１２３' });
		expect(repo.changePassword).toHaveBeenCalled();
	});

	it('counts Unicode code points like Python len', async () => {
		const repo = repository();
		await expect(new ChangePasswordUseCase(repo).execute({ currentPassword: 'old', newPassword: '😀😀😀😀a1' })).rejects.toThrow(/8 caracteres/);
		expect(repo.changePassword).not.toHaveBeenCalled();
	});

	it('delegates valid password changes to the repository', async () => {
		const repo = repository();
		await new ChangePasswordUseCase(repo).execute({ currentPassword: 'old', newPassword: 'secure123' });
		expect(repo.changePassword).toHaveBeenCalledWith({ currentPassword: 'old', newPassword: 'secure123' });
	});
});
