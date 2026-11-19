import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthRepositoryImpl } from '../../../../../../core/feature/auth/data/repository/AuthRepositoryImpl';
import { authSession } from '../../../../../../core/infrastructure/auth/AuthSession';

describe('AuthRepositoryImpl login', () => {
	beforeEach(() => authSession.clear());

	it('loads /me after login so page and override grants are authoritative', async () => {
		const login = vi.fn().mockResolvedValue({
			token: 'body-token-not-stored',
			user: {
				user_id: 7, username: 'operator', full_name: 'Operator', role: 'USER',
				warehouse_id: 2, warehouse_ids: [2], allowed_functions: ['receive'],
				is_active: true, must_change_password: false
			}
		});
		const me = vi.fn().mockResolvedValue({
			user_id: 7, username: 'operator', full_name: 'Operator', role: 'USER',
			warehouse_id: 2, warehouse_ids: [2], allowed_functions: ['receive'],
			allowed_pages: ['receiving'], allowed_overrides: ['so-full-edit'],
			is_active: true, must_change_password: false
		});
		const repository = new AuthRepositoryImpl({ login, me } as never);

		const result = await repository.login({ username: 'operator', password: 'secret' });

		expect(login).toHaveBeenCalledWith('operator', 'secret');
		expect(me).toHaveBeenCalledOnce();
		expect(result.user.allowedPages).toEqual(['receiving']);
		expect(result.user.allowedOverrides).toEqual(['so-full-edit']);
		expect(authSession.getUser()?.allowedPages).toEqual(['receiving']);
	});
});
