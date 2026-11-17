import { describe, expect, it } from 'vitest';
import { ManagedUserMapper } from '../../../../../core/feature/users/data/mapper/ManagedUserMapper';

describe('ManagedUserMapper', () => {
	it('maps nullable and multiple warehouse assignments without losing an empty assignment', () => {
		expect(ManagedUserMapper.toDomain({
			user_id: 7, username: 'operator', full_name: 'Warehouse Operator',
			role: 'USER', warehouse_id: null, warehouse_ids: [], allowed_functions: null,
			is_active: true, created_at: null, last_login: null,
		})).toMatchObject({ userId: 7, warehouseId: null, warehouseIds: [], allowedFunctions: [], isActive: true });
	});

	it('serializes explicit warehouse revocation without sending a conflicting legacy null', () => {
		expect(ManagedUserMapper.updateToDto({ userId: 7, warehouseIds: [] })).toEqual({
			warehouse_ids: [],
		});
	});

	it('serializes a multi-warehouse assignment and mirrors its first ID for legacy clients', () => {
		expect(ManagedUserMapper.updateToDto({ userId: 7, warehouseIds: [2, 5] })).toEqual({
			warehouse_ids: [2, 5], warehouse_id: 2,
		});
	});

	it('omits warehouse fields when the caller did not request an assignment change', () => {
		expect(ManagedUserMapper.updateToDto({ userId: 7, fullName: 'Updated' })).toEqual({
			full_name: 'Updated',
		});
	});

	it('preserves override grants in the replace-all permissions request', () => {
		expect(ManagedUserMapper.permissionsToDto({
			userId: 7, pageKeys: ['users', 'so-full-edit'],
		})).toEqual({ page_keys: ['users', 'so-full-edit'] });
	});
});
