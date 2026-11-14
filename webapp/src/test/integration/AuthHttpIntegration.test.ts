import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../../core/infrastructure/api/ApiClient';
import { AuthRemoteDataSource } from '../../core/feature/auth/data/datasource/AuthRemoteDataSource';
import { AuthRepositoryImpl } from '../../core/feature/auth/data/repository/AuthRepositoryImpl';
import { LoginUseCase } from '../../core/feature/auth/domain/usecase/LoginUseCase';
import { EnsureAuthenticatedUseCase } from '../../core/feature/auth/domain/usecase/EnsureAuthenticatedUseCase';
import { ChangePasswordUseCase } from '../../core/feature/auth/domain/usecase/ChangePasswordUseCase';
import { LogoutUseCase } from '../../core/feature/auth/domain/usecase/LogoutUseCase';
import { authSession } from '../../core/infrastructure/auth/AuthSession';

afterEach(() => {
	vi.unstubAllGlobals();
	authSession.clear();
});

const sampleUserDto = {
	user_id: 7,
	username: 'op1',
	full_name: 'Operador Uno',
	role: 'USER' as const,
	warehouse_id: 2,
	warehouse_ids: [2],
	allowed_functions: ['receive'],
	allowed_pages: ['inventory', 'receiving'],
	allowed_overrides: [],
	is_active: true,
	require_packing: true,
	must_change_password: false
};

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

function createStack(fetchMock: ReturnType<typeof vi.fn>) {
	vi.stubGlobal('fetch', fetchMock);
	const client = new ApiClient('https://wms.test');
	const ds = new AuthRemoteDataSource(client);
	const repo = new AuthRepositoryImpl(ds);
	return { repo, ds };
}

describe('Auth HTTP integration', () => {
	it('POST /api/auth/login maps user and stores session snapshot', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			jsonResponse({ token: 'opaque', user: sampleUserDto })
		);
		const { repo } = createStack(fetchMock);
		const result = await new LoginUseCase(repo).execute({
			username: 'op1',
			password: 'secret12'
		});
		expect(fetchMock).toHaveBeenCalledWith(
			'https://wms.test/api/auth/login',
			expect.objectContaining({ method: 'POST', credentials: 'include' })
		);
		expect(result.user.userId).toBe(7);
		expect(result.user.allowedPages).toEqual(['inventory', 'receiving']);
		expect(authSession.getUser()?.username).toBe('op1');
	});

	it('GET /api/auth/me validates session without client token', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse(sampleUserDto));
		const { repo } = createStack(fetchMock);
		const result = await new EnsureAuthenticatedUseCase(repo).execute();
		expect(fetchMock).toHaveBeenCalledWith(
			'https://wms.test/api/auth/me',
			expect.objectContaining({ method: 'GET', credentials: 'include' })
		);
		expect(result).toMatchObject({ ok: true });
		if (result.ok) expect(result.user.username).toBe('op1');
	});

	it('on /me 401 tries POST /api/auth/refresh then /me again', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse({ error: 'unauthorized' }, 401))
			.mockResolvedValueOnce(jsonResponse({ token: 'new' }))
			.mockResolvedValueOnce(jsonResponse(sampleUserDto));
		const { repo } = createStack(fetchMock);
		const result = await new EnsureAuthenticatedUseCase(repo).execute();
		expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
			'https://wms.test/api/auth/me',
			'https://wms.test/api/auth/refresh',
			'https://wms.test/api/auth/me'
		]);
		expect(result.ok).toBe(true);
	});

	it('POST /api/auth/change-password sends snake_case body', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'ok' }));
		const { repo } = createStack(fetchMock);
		await new ChangePasswordUseCase(repo).execute({
			currentPassword: 'old-pass-1',
			newPassword: 'new-pass-99'
		});
		const [, init] = fetchMock.mock.calls[0];
		expect(fetchMock.mock.calls[0][0]).toBe('https://wms.test/api/auth/change-password');
		expect(JSON.parse(init.body)).toEqual({
			current_password: 'old-pass-1',
			new_password: 'new-pass-99'
		});
	});

	it('POST /api/auth/logout clears in-memory session even if server fails', async () => {
		authSession.setUser({
			userId: 1,
			username: 'x',
			fullName: 'X',
			role: 'USER',
			warehouseIds: [],
			allowedPages: [],
			allowedFunctions: [],
			allowedOverrides: [],
			mustChangePassword: false
		});
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'down' }, 500));
		const { repo } = createStack(fetchMock);
		await expect(new LogoutUseCase(repo).execute()).rejects.toMatchObject({ status: 500 });
		expect(authSession.getUser()).toBeNull();
	});

	it('login rejects inactive user after successful HTTP 200', async () => {
		const inactive = { ...sampleUserDto, is_active: false };
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ token: 't', user: inactive }));
		const { repo } = createStack(fetchMock);
		await expect(
			new LoginUseCase(repo).execute({ username: 'op1', password: 'secret12' })
		).rejects.toThrow(/inactivo/i);
	});
});
