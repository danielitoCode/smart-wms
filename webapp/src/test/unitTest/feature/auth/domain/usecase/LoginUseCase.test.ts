import { describe, it, expect, vi } from 'vitest';
import { LoginUseCase } from '../../../../../../core/feature/auth/domain/usecase/LoginUseCase';
import type { AuthRepository } from '../../../../../../core/feature/auth/domain/repository/AuthRepository';
import type { LoginResult } from '../../../../../../core/feature/auth/domain/entity/User';

function createRepo(overrides: Partial<AuthRepository> = {}): AuthRepository {
	return {
		login: vi.fn(),
		getCurrentUser: vi.fn(),
		refreshToken: vi.fn(),
		logout: vi.fn(),
		changePassword: vi.fn(),
		...overrides
	};
}

describe('LoginUseCase', () => {
	it('logs in with trimmed username', async () => {
		const expected: LoginResult = {
			user: {
				userId: 1, username: 'admin', fullName: 'Admin', role: 'ADMIN',
				warehouseId: 1, warehouseIds: [1], allowedFunctions: ['receive'],
				allowedPages: [], allowedOverrides: [], isActive: true,
				requirePacking: true, mustChangePassword: false
			}
		};
		const repo = createRepo({ login: vi.fn().mockResolvedValue(expected) });
		const result = await new LoginUseCase(repo).execute({ username: '  admin  ', password: 'secret' });
		expect(repo.login).toHaveBeenCalledWith({ username: 'admin', password: 'secret' });
		expect(result).toEqual(expected);
	});

	it('rejects empty username', async () => {
		await expect(new LoginUseCase(createRepo()).execute({ username: '  ', password: 'x' })).rejects.toThrow(/username/);
	});

	it('rejects empty password', async () => {
		await expect(new LoginUseCase(createRepo()).execute({ username: 'admin', password: '' })).rejects.toThrow(/password/);
	});
});
