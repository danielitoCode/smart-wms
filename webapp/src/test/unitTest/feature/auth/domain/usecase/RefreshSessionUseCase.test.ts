import { describe, it, expect, vi } from 'vitest';
import { RefreshSessionUseCase } from '../../../../../../core/feature/auth/domain/usecase/RefreshSessionUseCase';
import type { AuthRepository } from '../../../../../../core/feature/auth/domain/repository/AuthRepository';

function createRepo(overrides: Partial<AuthRepository> = {}): AuthRepository {
	return {
		login: vi.fn(),
		getCurrentUser: vi.fn(),
		refreshToken: vi.fn().mockResolvedValue(undefined),
		logout: vi.fn(),
		changePassword: vi.fn(),
		...overrides
	};
}

describe('RefreshSessionUseCase', () => {
	it('delegates refresh to the repository', async () => {
		const repo = createRepo();
		await new RefreshSessionUseCase(repo).execute();
		expect(repo.refreshToken).toHaveBeenCalledOnce();
	});

	it('propagates repository failures', async () => {
		const repo = createRepo({
			refreshToken: vi.fn().mockRejectedValue(new Error('refresh failed'))
		});
		await expect(new RefreshSessionUseCase(repo).execute()).rejects.toThrow(/refresh failed/);
	});
});
