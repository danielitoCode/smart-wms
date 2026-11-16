import type { InboundActivityResource } from '../../domain/entity/InboundActivity';

export type InboundCanonicalLink = {
	href: string;
	searchValue: string;
	label: string;
};

/**
 * Resolve only links that the existing module routes can actually search.
 * canonical_id is a UUID external_id in the inbound write-through model,
 * not the numeric route id expected by most WMS detail screens.
 */
export function resolveInboundCanonicalLink(
	resource: InboundActivityResource,
	canonicalPayload: unknown,
	canonicalId: string | null = null
): InboundCanonicalLink | null {
	if (!canonicalPayload || typeof canonicalPayload !== 'object' || Array.isArray(canonicalPayload)) {
		return null;
	}

	const payload = canonicalPayload as Record<string, unknown>;
	if (resource === 'vendors' && canonicalId?.trim()) {
		return {
			href: `/management/vendors?canonical_id=${encodeURIComponent(canonicalId.trim())}`,
			searchValue: canonicalId.trim(),
			label: canonicalId.trim()
		};
	}

	const candidates: Partial<Record<InboundActivityResource, string[]>> = {
		items: ['sku'],
		purchase_orders: ['po_number'],
		sales_orders: ['so_number', 'sales_order_number']
	};
	const searchValue = candidates[resource]
		?.map(key => payload[key])
		.find((value): value is string => typeof value === 'string' && value.trim().length > 0)
		?.trim();

	if (!searchValue) return null;

	const paths: Partial<Record<InboundActivityResource, string>> = {
		items: '/items',
		purchase_orders: '/management/purchase-orders',
		sales_orders: '/management/sales-orders'
	};
	const path = paths[resource];
	if (!path) return null;

	return {
		href: `${path}?q=${encodeURIComponent(searchValue)}`,
		searchValue,
		label: searchValue
	};
}
