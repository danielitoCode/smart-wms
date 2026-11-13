import { describe, expect, it } from 'vitest';
import { CustomerMapper } from '../../../../../../core/feature/customers/data/mapper/CustomerMapper';

describe('CustomerMapper', () => {
	it('projects distinct customers from SO rows and counts orders', () => {
		const result = CustomerMapper.fromSalesOrderProjection([
			{ customer_id: 'c1', customer_name: 'Acme', customer_email: 'a@x.com', warehouse_id: 1 },
			{ customer_id: 'c1', customer_name: 'Acme', customer_phone: '555', warehouse_id: 1 },
			{ customer_id: 'c2', customer_name: 'Beta', warehouse_id: 2 }
		]);

		expect(result).toHaveLength(2);
		const acme = result.find((c) => c.id === 'c1');
		expect(acme?.orderCount).toBe(2);
		expect(acme?.email).toBe('a@x.com');
		expect(acme?.phone).toBe('555');
	});

	it('maps search hits and parses order count from sublabel', () => {
		const customer = CustomerMapper.fromSearchHit({
			type: 'customer',
			label: 'Search Test Customer',
			sublabel: '3 orders',
			customer_id: 'cust-001'
		});
		expect(customer).toEqual({
			id: 'cust-001',
			name: 'Search Test Customer',
			email: null,
			phone: null,
			orderCount: 3,
			warehouseId: null
		});
	});
});
