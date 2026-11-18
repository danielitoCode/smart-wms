import { describe, expect, it } from 'vitest';
import {
	MANAGED_USER_PERMISSION_GROUPS,
	MANAGED_USER_PERMISSION_KEYS,
} from '../../../../../core/feature/users/ui/config/userPermissionGroups';

describe('managed user permission catalog', () => {
	it('matches the Flask ALL_PAGE_KEYS and ALL_OVERRIDE_KEYS catalog', () => {
		expect(MANAGED_USER_PERMISSION_KEYS).toEqual([
			'dashboard',
			'inventory', 'cycle-counts', 'count-approvals',
			'purchase-orders', 'receiving', 'putaway',
			'sales-orders', 'backorders', 'fraud', 'picking-tickets', 'picking-batches',
			'items', 'vendors', 'adjustments', 'inter-warehouse-transfers', 'transfer-orders',
			'warehouses', 'bins', 'zones', 'preferred-bins',
			'users', 'api-tokens', 'inbound', 'consumer-groups', 'channels',
			'webhooks', 'notifications', 'audit-log', 'imports', 'integrations', 'settings',
			'so-full-edit',
		]);
	});

	it('keeps override capabilities separate from ordinary navigation pages', () => {
		const overrides = MANAGED_USER_PERMISSION_GROUPS.filter((group) => group.isOverride);
		expect(overrides).toHaveLength(1);
		expect(overrides[0].pages.map(([key]) => key)).toEqual(['so-full-edit']);
	});
});
