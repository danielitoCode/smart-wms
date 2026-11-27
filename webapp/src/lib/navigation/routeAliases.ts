const LEGACY_ROUTE_TARGETS: Readonly<Record<string, string>> = {
	'/adjustments': '/management/adjustments',
	'/api-tokens': '/management/api-tokens',
	'/audit-log': '/management/audit-log',
	'/backorders': '/management/backorders',
	'/bins': '/data/bins',
	'/channels': '/management/channels',
	'/consumer-groups': '/management/consumer-groups',
	'/count-approvals': '/management/count-approvals',
	'/cycle-counts': '/cycle-count',
	'/fraud': '/management/fraud',
	'/imports': '/management/imports',
	'/inbound': '/management/inbound-activity',
	'/integrations': '/management/integrations',
	'/inter-warehouse-transfers': '/management/inter-warehouse-transfers',
	'/notifications': '/management/notifications',
	'/pos-activity': '/management/pos-activity',
	'/preferred-bins': '/data/preferred-bins',
	'/purchase-orders': '/management/purchase-orders',
	'/returns': '/management/returns',
	'/returns/refunds': '/management/refunds',
	'/returns/rma': '/management/returns',
	'/rma': '/management/returns',
	'/settings': '/management/settings',
	'/transfer-orders': '/management/transfer-orders',
	'/users': '/management/users',
	'/vendors': '/management/vendors',
	'/warehouses': '/data/warehouses',
	'/webhooks': '/management/webhooks',
	'/zones': '/data/zones',
	'/management/preferred-bins': '/data/preferred-bins'
};

/**
 * Returns a redirect destination for a reviewed legacy/non-canonical route.
 * Query strings and client-side fragments are retained for bookmarked views.
 */
export function getCanonicalRouteRedirect(url: URL): string | null {
	const pathname =
		url.pathname.length > 1 && url.pathname.endsWith('/')
			? url.pathname.slice(0, -1)
			: url.pathname;
	const target = LEGACY_ROUTE_TARGETS[pathname];
	return target ? `${target}${url.search}${url.hash}` : null;
}

/** Accept only same-origin absolute paths as post-login return destinations. */
export function resolveSafeInternalRedirect(candidate: string | null | undefined): string | null {
	if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
		return null;
	}

	try {
		const base = new URL('https://smart-wms.invalid');
		const target = new URL(candidate, base);
		if (target.origin !== base.origin || target.pathname === '/login' || target.pathname === '/login/') {
			return null;
		}
		return `${target.pathname}${target.search}${target.hash}`;
	} catch {
		return null;
	}
}
