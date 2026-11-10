import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnsureAuthenticatedUseCase } from '../../../../../../core/feature/auth/domain/usecase/EnsureAuthenticatedUseCase';
import type { AuthRepository } from '../../../../../../core/feature/auth/domain/repository/AuthRepository';
import type { User } from '../../../../../../core/feature/auth/domain/entity/User';
import { authSession } from '../../../../../../core/infrastructure/auth/AuthSession';
import { ApiError } from '../../../../../../core/infrastructure/errors/ApiError';

const sampleUser: User = {
	userId: 1,
	username: 'admin',
	fullName: 'Admin',
	role: 'ADMIN',
	warehouseId: 1,
	warehouseIds: [1],
	allowedFunctions: [],
	isActive: true,
	requirePacking: false
};

function createRepo(overrides: Partial<AuthRepository> = {}): AuthRepository {
	return {
		login: vi.fn(),
		getCurrentUser: vi.fn(),
		refreshToken: vi.fn(),
		logout: vi.fn(),
		...overrides
	};
}

describe('EnsureAuthenticatedUseCase', () => {
	beforeEach(() => {
		authSession.clear();
	});

	it('returns missing_token when no JWT is stored', async () => {
		const useCase = new EnsureAuthenticatedUseCase(createRepo());
		const result = await useCase.execute();
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('missing_token');
	});

	it('returns user when /me succeeds', async () => {
		authSession.setSession('jwt', {
			userId: 1,
			username: 'admin',
			fullName: 'Admin',
			role: 'ADMIN',
			warehouseIds: [1]
		});
		const repo = createRepo({
			getCurrentUser: vi.fn().mockResolvedValue(sampleUser)
		});
		const useCase = new EnsureAuthenticatedUseCase(repo);
		const result = await useCase.execute();
		expect(result).toEqual({ ok: true, user: sampleUser });
		expect(repo.refreshToken).not.toHaveBeenCalled();
	});

	it('refreshes once after 401 and recovers', async () => {
		authSession.setSession('expired', {
			userId: 1,
			username: 'admin',
			fullName: 'Admin',
			role: 'ADMIN',
			warehouseIds: [1]
		});
		const repo = createRepo({
			getCurrentUser: vi
				.fn()
				.mockRejectedValueOnce(new ApiError(401, 'unauthorized'))
				.mockResolvedValueOnce(sampleUser),
			refreshToken: vi.fn().mockResolvedValue('new-jwt')
		});
		const useCase = new EnsureAuthenticatedUseCase(repo);
		const result = await useCase.execute();
		expect(repo.refreshToken).toHaveBeenCalledOnce();
		expect(result.ok).toBe(true);
	});

	it('clears session and returns unauthorized when refresh fails with 401', async () => {
		authSession.setSession('bad', {
			userId: 1,
			username: 'admin',
			fullName: 'Admin',
			role: 'ADMIN',
			warehouseIds: [1]
		});
		const repo = createRepo({
			getCurrentUser: vi.fn().mockRejectedValue(new ApiError(401, 'unauthorized')),
			refreshToken: vi.fn().mockRejectedValue(new ApiError(401, 'expired')),
			logout: vi.fn()
		});
		const useCase = new EnsureAuthenticatedUseCase(repo);
		const result = await useCase.execute();
		expect(repo.logout).toHaveBeenCalled();
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('unauthorized');
	});

	it('returns unavailable on network errors without clearing session', async () => {
		authSession.setSession('jwt', {
			userId: 1,
			username: 'admin',
			fullName: 'Admin',
			role: 'ADMIN',
			warehouseIds: [1]
		});
		const repo = createRepo({
			getCurrentUser: vi.fn().mockRejectedValue(new ApiError(0, 'Network error', 'network')),
			logout: vi.fn()
		});
		const useCase = new EnsureAuthenticatedUseCase(repo);
		const result = await useCase.execute();
		expect(repo.logout).not.toHaveBeenCalled();
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('unavailable');
		expect(authSession.getToken()).toBe('jwt');
	});

	it('does not clear session when refresh fails due to network after 401 on /me', async () => {
		authSession.setSession('jwt', {
			userId: 1,
			username: 'admin',
			fullName: 'Admin',
			role: 'ADMIN',
			warehouseIds: [1]
		});
		const repo = createRepo({
			getCurrentUser: vi.fn().mockRejectedValue(new ApiError(401, 'unauthorized')),
			refreshToken: vi.fn().mockRejectedValue(new ApiError(0, 'Network error', 'network')),
			logout: vi.fn()
		});
		const useCase = new EnsureAuthenticatedUseCase(repo);
		const result = await useCase.execute();
		expect(repo.logout).not.toHaveBeenCalled();
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('unavailable');
		expect(authSession.getToken()).toBe('jwt');
	});

	it('treats 403 on /me as unauthorized path and tries refresh', async () => {
		authSession.setSession('jwt', {
			userId: 1,
			username: 'admin',
			fullName: 'Admin',
			role: 'ADMIN',
			warehouseIds: [1]
		});
		const repo = createRepo({
			getCurrentUser: vi
				.fn()
				.mockRejectedValueOnce(new ApiError(403, 'forbidden'))
				.mockResolvedValueOnce(sampleUser),
			refreshToken: vi.fn().mockResolvedValue('new')
		});
		const useCase = new EnsureAuthenticatedUseCase(repo);
		const result = await useCase.execute();
		expect(repo.refreshToken).toHaveBeenCalledOnce();
		expect(result.ok).toBe(true);
	});
});
