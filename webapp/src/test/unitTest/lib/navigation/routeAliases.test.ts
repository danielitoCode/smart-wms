import { describe, expect, it } from 'vitest';
import {
	getCanonicalRouteRedirect,
	resolveSafeInternalRedirect
} from '../../../../lib/navigation/routeAliases';

describe('canonical route redirects', () => {
	it.each([
		['/adjustments', '/management/adjustments'],
		['/api-tokens', '/management/api-tokens'],
		['/audit-log', '/management/audit-log'],
		['/backorders', '/management/backorders'],
		['/bins', '/data/bins'],
		['/channels', '/management/channels'],
		['/consumer-groups', '/management/consumer-groups'],
		['/count-approvals', '/management/count-approvals'],
		['/cycle-counts', '/cycle-count'],
		['/fraud', '/management/fraud'],
		['/imports', '/management/imports'],
		['/inbound', '/management/inbound-activity'],
		['/integrations', '/management/integrations'],
		['/inter-warehouse-transfers', '/management/inter-warehouse-transfers'],
		['/notifications', '/management/notifications'],
		['/pos-activity', '/management/pos-activity'],
		['/preferred-bins', '/data/preferred-bins'],
		['/purchase-orders', '/management/purchase-orders'],
		['/returns', '/management/returns'],
		['/returns/refunds', '/management/refunds'],
		['/returns/rma', '/management/returns'],
		['/rma', '/management/returns'],
		['/settings', '/management/settings'],
		['/transfer-orders', '/management/transfer-orders'],
		['/users', '/management/users'],
		['/vendors', '/management/vendors'],
		['/warehouses', '/data/warehouses'],
		['/webhooks', '/management/webhooks'],
		['/zones', '/data/zones'],
		['/management/preferred-bins', '/data/preferred-bins']
	])('maps %s to %s', (pathname, expected) => {
		expect(getCanonicalRouteRedirect(new URL(`https://smart-wms.invalid${pathname}`))).toBe(expected);
	});

	it('preserves query strings and fragments', () => {
		expect(
			getCanonicalRouteRedirect(new URL('https://smart-wms.invalid/bins?zone_id=12&search=A#results'))
		).toBe('/data/bins?zone_id=12&search=A#results');
	});

	it('normalizes a trailing slash before resolving aliases', () => {
		expect(getCanonicalRouteRedirect(new URL('https://smart-wms.invalid/rma/'))).toBe('/management/returns');
	});

	it('leaves canonical and unreviewed routes unchanged', () => {
		expect(getCanonicalRouteRedirect(new URL('https://smart-wms.invalid/management/returns'))).toBeNull();
		expect(getCanonicalRouteRedirect(new URL('https://smart-wms.invalid/unknown'))).toBeNull();
	});
});

describe('safe post-login redirect', () => {
	it('preserves a same-origin deep link including query and fragment', () => {
		expect(resolveSafeInternalRedirect('/management/sales-orders/42?tab=lines#detail')).toBe(
			'/management/sales-orders/42?tab=lines#detail'
		);
	});

	it.each(['https://evil.example/path', '//evil.example/path', '/\\\\evil.example', '/login', '/login?redirect=%2F'])(
		'rejects unsafe or recursive destination %s',
		(candidate) => expect(resolveSafeInternalRedirect(candidate)).toBeNull()
	);

	it('returns null for an empty destination', () => {
		expect(resolveSafeInternalRedirect(null)).toBeNull();
	});
});
