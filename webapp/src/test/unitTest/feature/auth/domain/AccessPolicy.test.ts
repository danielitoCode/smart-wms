import { describe, expect, it } from 'vitest';
import {
	canAccessAdminRoute,
	canSelectWarehouse,
	resolveWarehouseSelection,
	routeAccessPolicyForPath
} from '../../../../../core/feature/auth/domain/policy/AccessPolicy';

describe('R8/R9 administrative route access', () => {
	it('restricts global audit log to ADMIN even when USER has the audit-log page grant', () => {
		const policy = routeAccessPolicyForPath('/management/audit-log');
		expect(policy).toEqual({ kind: 'admin' });
		expect(canAccessAdminRoute('USER')).toBe(false);
		expect(canAccessAdminRoute('ADMIN')).toBe(true);
	});

	it('restricts global webhook subscriptions, DLQ and replay to ADMIN', () => {
		expect(routeAccessPolicyForPath('/management/webhooks')).toEqual({ kind: 'admin' });
		expect(routeAccessPolicyForPath('/management/webhooks/subscription-id')).toEqual({ kind: 'admin' });
		expect(canAccessAdminRoute('USER')).toBe(false);
		expect(canAccessAdminRoute('ADMIN')).toBe(true);
	});

	it('restricts warehouse administration routes to ADMIN', () => {
		expect(routeAccessPolicyForPath('/warehouses')).toEqual({ kind: 'admin' });
		expect(routeAccessPolicyForPath('/data/warehouses')).toEqual({ kind: 'admin' });
	});

	it('keeps the data landing page available for scoped master-data grants, not warehouse-only grants', () => {
		expect(routeAccessPolicyForPath('/data')).toEqual({
			kind: 'any',
			pageKeys: ['bins', 'zones', 'preferred-bins']
		});
	});

	it('does not let a USER warehouse page grant expand operational selection beyond assignments', () => {
		const input = {
			role: 'USER',
			allowedPages: ['warehouses'],
			assignedWarehouseIds: [2],
			availableWarehouseIds: [1, 2, 3]
		};
		expect(resolveWarehouseSelection({ ...input, savedId: 1 })).toBe(2);
		expect(canSelectWarehouse(input, 1)).toBe(false);
		expect(canSelectWarehouse(input, 2)).toBe(true);
	});

	it('keeps ADMIN warehouse selection global', () => {
		expect(resolveWarehouseSelection({
			role: 'ADMIN',
			allowedPages: [],
			assignedWarehouseIds: [],
			availableWarehouseIds: [1, 2],
			savedId: 2
		})).toBe(2);
	});
});
