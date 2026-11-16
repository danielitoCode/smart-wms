import { describe, expect, it } from 'vitest';
import { resolveInboundCanonicalLink } from '../../../../../core/feature/inbound-activity/ui/links/inboundCanonicalLink';

describe('resolveInboundCanonicalLink', () => {
	it('uses the real item list route and its supported q parameter', () => {
		expect(resolveInboundCanonicalLink('items', { sku: 'SKU 17' })).toEqual({
			href: '/items?q=SKU%2017',
			searchValue: 'SKU 17',
			label: 'SKU 17'
		});
	});

	it('uses the purchase-order management route and supported po_number search', () => {
		expect(resolveInboundCanonicalLink('purchase_orders', { po_number: 'PO-17' })?.href)
			.toBe('/management/purchase-orders?q=PO-17');
	});

	it('uses the sales-order management route and supported so_number search', () => {
		expect(resolveInboundCanonicalLink('sales_orders', { so_number: 'SO-17' })?.href)
			.toBe('/management/sales-orders?q=SO-17');
	});

	it('opens vendor detail by the canonical UUID route parameter', () => {
		expect(resolveInboundCanonicalLink('vendors', null, '5d32f7bb-a2e9-4a1b-8e6a-62d1f2c1c9d1')?.href)
			.toBe('/management/vendors?canonical_id=5d32f7bb-a2e9-4a1b-8e6a-62d1f2c1c9d1');
	});

	it('does not mistake a canonical UUID for a numeric item detail route or expose redacted customer names', () => {
		expect(resolveInboundCanonicalLink('customers', { customer_name: '[REDACTED]' })).toBeNull();
		expect(resolveInboundCanonicalLink('items', { id: '5d32f7bb-a2e9-4a1b-8e6a-62d1f2c1c9d1' })).toBeNull();
		expect(resolveInboundCanonicalLink('purchase_orders', null)).toBeNull();
	});
});
