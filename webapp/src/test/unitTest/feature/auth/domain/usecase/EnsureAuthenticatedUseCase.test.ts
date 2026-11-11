import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnsureAuthenticatedUseCase } from '../../../../../../core/feature/auth/domain/usecase/EnsureAuthenticatedUseCase';
import type { AuthRepository } from '../../../../../../core/feature/auth/domain/repository/AuthRepository';
import type { User } from '../../../../../../core/feature/auth/domain/entity/User';
import { authSession } from '../../../../../../core/infrastructure/auth/AuthSession';
import { ApiError } from '../../../../../../core/infrastructure/errors/ApiError';

const sampleUser: User = {
	userId: 1, username: 'admin', fullName: 'Admin', role: 'ADMIN',
	warehouseId: 1, warehouseIds: [1], allowedFunctions: [],
	allowedPages: [], allowedOverrides: [], isActive: true,
	requirePacking: true, mustChangePassword: false
};

function createRepo(overrides: Partial<AuthRepository> = {}): AuthRepository {
	return {
		login: vi.fn(), getCurrentUser: vi.fn(), refreshToken: vi.fn(),
		logout: vi.fn(), changePassword: vi.fn(), ...overrides
	};
}

describe('EnsureAuthenticatedUseCase', () => {
	beforeEach(() => authSession.clear());

	it('validates the HttpOnly cookie through /me without requiring a client-readable token', async () => {
		const repo = createRepo({ getCurrentUser: vi.fn().mockResolvedValue(sampleUser) });
		const result = await new EnsureAuthenticatedUseCase(repo).execute();
		expect(repo.getCurrentUser).toHaveBeenCalledOnce();
		expect(result).toEqual({ ok: true, user: sampleUser });
	});

	it('returns anonymous on 401 and clears only the in-memory user', async () => {
		authSession.setUser({ userId: 1, username: 'admin', fullName: 'Admin', role: 'ADMIN', warehouseIds: [1], allowedPages: [], allowedFunctions: [] });
		const repo = createRepo({ getCurrentUser: vi.fn().mockRejectedValue(new ApiError(401, 'unauthorized')) });
		const result = await new EnsureAuthenticatedUseCase(repo).execute();
		expect(result).toMatchObject({ ok: false, reason: 'unauthorized' });
		expect(authSession.getUser()).toBeNull();
		expect(repo.refreshToken).not.toHaveBeenCalled();
	});

	it('preserves the in-memory user when the API is unavailable', async () => {
		const current = { userId: 1, username: 'admin', fullName: 'Admin', role: 'ADMIN', warehouseIds: [1], allowedPages: [], allowedFunctions: [] };
		authSession.setUser(current);
		const repo = createRepo({ getCurrentUser: vi.fn().mockRejectedValue(new ApiError(0, 'Network error', 'network')) });
		const result = await new EnsureAuthenticatedUseCase(repo).execute();
		expect(result).toMatchObject({ ok: false, reason: 'unavailable' });
		expect(authSession.getUser()).toEqual(current);
	});

	it('does not treat a 403 response as an expired login', async () => {
		const repo = createRepo({ getCurrentUser: vi.fn().mockRejectedValue(new ApiError(403, 'Forbidden')) });
		const result = await new EnsureAuthenticatedUseCase(repo).execute();
		expect(result).toMatchObject({ ok: false, reason: 'unavailable' });
		expect(repo.refreshToken).not.toHaveBeenCalled();
	});
});
