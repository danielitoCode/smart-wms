import { expect, test } from '@playwright/test';

const aliases: Array<[string, string]> = [
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
];

test('legacy bookmarks receive permanent server redirects to canonical routes', async ({ request }) => {
	for (const [legacyPath, canonicalPath] of aliases) {
		const response = await request.get(`${legacyPath}?route_test=1`, { maxRedirects: 0 });
		expect(response.status(), legacyPath).toBe(308);
		expect(response.headers().location, legacyPath).toBe(`${canonicalPath}?route_test=1`);
	}
});

test('canonical route does not redirect again', async ({ request }) => {
	const response = await request.get('/management/returns', { maxRedirects: 0 });
	expect(response.status()).not.toBe(308);
});
