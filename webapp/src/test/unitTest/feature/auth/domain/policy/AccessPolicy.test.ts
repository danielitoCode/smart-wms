import { describe, it, expect } from 'vitest';
import {
	canAccessPages,
	canAccessOperationalFunction,
	canPerform,
	hasOverride,
	requiredPageKeysForPath,
	resolveHomePath,
	canAccessAnyPages,
	routeAccessPolicyForPath
} from '../../../../../../core/feature/auth/domain/policy/AccessPolicy';
import { ALL_PAGE_KEYS, isKnownPageKey } from '../../../../../../core/feature/auth/domain/policy/PermissionCatalog';
import { PERMISSION_MATRIX } from '../../../../../../core/feature/auth/domain/policy/PermissionMatrix';

describe('AccessPolicy F0.2', () => {
	it('ADMIN bypasses every page key', () => {
		expect(canAccessPages('ADMIN', [], ['fraud', 'users', 'settings'])).toBe(true);
		expect(
			canPerform('ADMIN', [], [], { pageKey: 'fraud', capability: 'open_page' })
		).toBe(true);
	});

	it('USER without permission cannot open protected pages', () => {
		expect(canAccessPages('USER', ['inventory'], ['fraud'])).toBe(false);
		expect(canAccessPages('USER', [], ['inventory'])).toBe(false);
	});

	it('USER with read page key can open page', () => {
		expect(canAccessPages('USER', ['sales-orders'], ['sales-orders'])).toBe(true);
	});

	it('USER with sales-orders but without so-full-edit fails full-edit grant', () => {
		expect(
			canPerform('USER', ['sales-orders'], [], {
				pageKey: 'sales-orders',
				capability: 'approve_or_modify',
				overrideKey: 'so-full-edit'
			})
		).toBe(false);
		expect(
			canPerform('USER', ['sales-orders'], ['so-full-edit'], {
				pageKey: 'sales-orders',
				capability: 'approve_or_modify',
				overrideKey: 'so-full-edit'
			})
		).toBe(true);
	});

	it('revoked permission: allowedPages without key fails', () => {
		const before = ['inventory', 'fraud'];
		const afterRevoke = ['inventory'];
		expect(canAccessPages('USER', before, ['fraud'])).toBe(true);
		expect(canAccessPages('USER', afterRevoke, ['fraud'])).toBe(false);
	});

	it('Dashboard route requires the dashboard grant and ADMIN bypasses it', () => {
		const required = requiredPageKeysForPath('/dashboard');
		expect(required).toEqual(['dashboard']);
		expect(canAccessPages('USER', [], required)).toBe(false);
		expect(canAccessPages('USER', ['dashboard'], required)).toBe(true);
		expect(canAccessPages('ADMIN', [], required)).toBe(true);
	});

	it('direct URL fraud requires fraud key not sales-orders', () => {
		expect(requiredPageKeysForPath('/management/fraud')).toEqual(['fraud']);
		expect(canAccessPages('USER', ['sales-orders'], requiredPageKeysForPath('/management/fraud'))).toBe(
			false
		);
		expect(canAccessPages('USER', ['fraud'], requiredPageKeysForPath('/management/fraud'))).toBe(true);
	});

	it('direct sales-order detail URLs require the sales-orders page grant', () => {
		const required = requiredPageKeysForPath('/sales-orders/42');
		expect(required).toEqual(['sales-orders']);
		expect(canAccessPages('USER', [], required)).toBe(false);
		expect(canAccessPages('USER', ['sales-orders'], required)).toBe(true);
	});

	it('backorder detail route remains gated by the backorders page grant', () => {
		const required = requiredPageKeysForPath('/management/backorders/41');
		expect(required).toEqual(['backorders']);
		expect(canAccessPages('USER', ['backorders'], required)).toBe(true);
		expect(canAccessPages('USER', ['sales-orders'], required)).toBe(false);
	});

	it('count-approvals page open uses count-approvals key', () => {
		expect(requiredPageKeysForPath('/management/count-approvals')).toEqual(['count-approvals']);
	});

	it('vendors route is gated by the vendors permission key', () => {
		const required = requiredPageKeysForPath('/management/vendors');
		expect(required).toEqual(['vendors']);
		expect(canAccessPages('USER', [], required)).toBe(false);
		expect(canAccessPages('USER', ['vendors'], required)).toBe(true);
		expect(canAccessPages('ADMIN', [], required)).toBe(true);
	});

	it('zones route is gated by the zones permission key', () => {
		const required = requiredPageKeysForPath('/data/zones');
		expect(required).toEqual(['zones']);
		expect(canAccessPages('USER', ['zones'], required)).toBe(true);
		expect(canAccessPages('USER', ['warehouses'], required)).toBe(false);
		expect(canAccessPages('ADMIN', [], required)).toBe(true);
	});

	it('hasOverride respects ADMIN and list', () => {
		expect(hasOverride('ADMIN', [], 'so-full-edit')).toBe(true);
		expect(hasOverride('USER', [], 'so-full-edit')).toBe(false);
		expect(hasOverride('USER', ['so-full-edit'], 'so-full-edit')).toBe(true);
	});

	it('resolveHomePath respects mustChangePassword and grants', () => {
		expect(resolveHomePath({ role: 'USER', allowedPages: ['receiving'], mustChangePassword: true })).toBe(
			'/change-password'
		);
		expect(resolveHomePath({ role: 'USER', allowedPages: ['receiving'] })).toBe('/receiving');
	});

	it('catalog contains fraud and count-approvals', () => {
		expect(isKnownPageKey('fraud')).toBe(true);
		expect(isKnownPageKey('count-approvals')).toBe(true);
		expect(ALL_PAGE_KEYS.includes('fraud')).toBe(true);
	});

	it('permission matrix marks fraud gate as fraud', () => {
		const fraud = PERMISSION_MATRIX.find((r) => r.sveltePath === '/management/fraud');
		expect(fraud?.flaskGate).toBe('fraud');
		expect(fraud?.pageKey).toBe('fraud');
	});
});


describe('Preferred Bins route access', () => {
	it('gates the data route with the preferred-bins page grant', () => {
		expect(requiredPageKeysForPath('/data/preferred-bins')).toEqual(['preferred-bins']);
		expect(canAccessPages('USER', [], requiredPageKeysForPath('/data/preferred-bins'))).toBe(false);
		expect(canAccessPages('USER', ['preferred-bins'], requiredPageKeysForPath('/data/preferred-bins'))).toBe(true);
	});

	it('uses Preferred Bins as the landing page when it is the only grant', () => {
		expect(resolveHomePath({ role: 'USER', allowedPages: ['preferred-bins'] })).toBe('/data/preferred-bins');
	});
});


describe('explicit app route access policies', () => {
	it('requires an explicit page grant for protected feature routes', () => {
		expect(routeAccessPolicyForPath('/management/fraud')).toEqual({
			kind: 'all',
			pageKeys: ['fraud']
		});
	});

	it('allows only one of the data-area grants on the Data landing page', () => {
		const policy = routeAccessPolicyForPath('/data');
		expect(policy).toEqual({
			kind: 'any',
			pageKeys: ['bins', 'zones', 'preferred-bins']
		});
		expect(canAccessAnyPages('USER', ['bins'], policy?.kind === 'any' ? policy.pageKeys : [])).toBe(true);
		expect(canAccessAnyPages('USER', ['inventory'], policy?.kind === 'any' ? policy.pageKeys : [])).toBe(false);
	});

	it('requires ticket permission plus the sales-orders/fraud grant used by the Flask queue API', () => {
		const policy = routeAccessPolicyForPath('/picking-tickets/42/print');
		expect(policy).toEqual({
			kind: 'allAndAny',
			allPageKeys: ['picking-tickets'],
			anyPageKeys: ['sales-orders', 'fraud']
		});
		if (policy?.kind !== 'allAndAny') throw new Error('Expected ticket route policy');
		expect(canAccessPages('USER', ['picking-tickets'], policy.allPageKeys)).toBe(true);
		expect(canAccessAnyPages('USER', ['picking-tickets'], policy.anyPageKeys)).toBe(false);
		expect(canAccessAnyPages('USER', ['picking-tickets', 'fraud'], policy.anyPageKeys)).toBe(true);
		expect(canAccessPages('ADMIN', [], policy.allPageKeys)).toBe(true);
	});

	it('requires the matching operational grant for each scanner workflow', () => {
		expect(routeAccessPolicyForPath('/picking')).toEqual({ kind: 'function', functionKey: 'pick' });
		expect(routeAccessPolicyForPath('/packing/scan')).toEqual({ kind: 'function', functionKey: 'pack' });
		expect(routeAccessPolicyForPath('/shipping')).toEqual({ kind: 'function', functionKey: 'ship' });
		expect(canAccessOperationalFunction('USER', ['pick'], 'pick')).toBe(true);
		expect(canAccessOperationalFunction('USER', ['pick'], 'pack')).toBe(false);
		expect(canAccessOperationalFunction('USER', [], 'ship')).toBe(false);
		expect(canAccessOperationalFunction('ADMIN', [], 'ship')).toBe(true);
	});

	it('fails closed for an unregistered route instead of treating an empty grant list as public', () => {
		expect(routeAccessPolicyForPath('/unregistered-admin-page')).toBeNull();
	});
});


describe('warehouse master-data route grants', () => {
	it('uses the bins grant alone for bin routes, matching Flask', () => {
		expect(requiredPageKeysForPath('/data/bins')).toEqual(['bins']);
		expect(requiredPageKeysForPath('/data/bins/42')).toEqual(['bins']);
	});

	it('uses the warehouses grant alone for warehouse detail routes', () => {
		expect(requiredPageKeysForPath('/warehouses/7')).toEqual(['warehouses']);
	});
});


describe('route matcher boundaries', () => {
	it('does not treat a similarly prefixed but unknown path as a granted feature route', () => {
		expect(routeAccessPolicyForPath('/management/fraudulent')).toBeNull();
		expect(routeAccessPolicyForPath('/data/bins-archive')).toBeNull();
	});
});
