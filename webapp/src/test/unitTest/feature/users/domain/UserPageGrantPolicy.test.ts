import { describe, expect, it } from 'vitest';
import { editableUserPageGrantKeys } from '../../../../../core/feature/users/domain/policy/UserPageGrantPolicy';
import type { UserPagePermissions } from '../../../../../core/feature/users/domain/entity/UserManagement';

describe('editableUserPageGrantKeys', () => {
	it('preserves explicitly persisted grants for a USER', () => {
		const permissions: UserPagePermissions = {
			userId: 7, role: 'USER', pageKeys: ['users', 'inventory'], isFullAccess: false,
		};
		expect(editableUserPageGrantKeys(permissions)).toEqual(['users', 'inventory']);
	});

	it('does not convert the synthetic ADMIN full-access catalog into USER grants', () => {
		const permissions: UserPagePermissions = {
			userId: 9, role: 'ADMIN', pageKeys: ['users', 'settings', 'audit-log', 'so-full-edit'],
			isFullAccess: true,
		};
		expect(editableUserPageGrantKeys(permissions)).toEqual([]);
	});

	it('fails closed when permissions could not be loaded', () => {
		expect(editableUserPageGrantKeys(null)).toEqual([]);
	});
});
