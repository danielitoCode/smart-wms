import { describe, expect, it } from 'vitest';
import {
	getCanonicalRouteRedirect,
	resolveSafeInternalRedirect
} from '../../../lib/navigation/routeAliases';

describe('canonical route redirects', () => {
	it.each([
		['/rma', '/management/returns'],
		['/returns/rma', '/management/returns'],
		['/returns/refunds', '/management/refunds'],
		['/warehouses', '/data/warehouses'],
		['/bins', '/data/bins'],
		['/zones', '/data/zones'],
		['/preferred-bins', '/data/preferred-bins'],
		['/cycle-counts', '/cycle-count'],
		['/purchase-orders', '/management/purchase-orders'],
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
