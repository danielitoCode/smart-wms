import { describe, expect, it } from 'vitest';
import { CustomerMapper } from '../../../../../../core/feature/customers/data/mapper/CustomerMapper';

describe('CustomerMapper', () => {
	it('merges duplicate customer names and accumulates only rows in the supplied page', () => {
		const result = CustomerMapper.fromSalesOrderProjection([
			{ so_id: 1, customer_name: 'Acme', customer_phone: '555', warehouse_id: 1, customer_address: '10 Main' },
			{ so_id: 2, customer_name: ' acme ', warehouse_id: 1, customer_address: '10 Main' },
			{ so_id: 3, customer_name: 'ACME', warehouse_id: 2, shipping_address_line1: '20 Oak', shipping_address_city: 'Miami' },
			{ so_id: 4, customer_name: 'Beta', warehouse_id: 2 }
		]);
		expect(result).toHaveLength(2);
		const acme = result.find((customer) => customer.name === 'Acme');
		expect(acme?.orderCount).toBe(3);
		expect(acme?.phone).toBe('555');
		expect(acme?.warehouseIds).toEqual([1, 2]);
		expect(acme?.addresses).toHaveLength(2);
	});
	it('uses the legacy ship_address when structured shipping fields are absent', () => {
		const [customer] = CustomerMapper.fromSalesOrderProjection([{ customer_name: 'Legacy', ship_address: 'Warehouse Gate 2' }]);
		expect(customer.addresses).toContainEqual(expect.objectContaining({ kind: 'shipping', lines: ['Warehouse Gate 2'] }));
	});
	it('returns an empty projection when no orders exist', () => { expect(CustomerMapper.fromSalesOrderProjection([])).toEqual([]); });
	it('ignores rows without customer identity and tolerates incomplete contact data', () => {
		const result = CustomerMapper.fromSalesOrderProjection([{ customer_name: null, customer_phone: '555' }, { customer_name: '   ', warehouse_id: 1 }, { customer_name: 'No Contact', so_id: 1 }]);
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ name: 'No Contact', phone: null, orderCount: 1, addresses: [] });
	});
	it('maps global search hits without inventing contact or canonical IDs', () => {
		const customer = CustomerMapper.fromSearchHit({ type: 'customer', id: 'Search Test', label: 'Search Test', sublabel: '3 orders' });
		expect(customer).toMatchObject({ id: 'search test', name: 'Search Test', email: null, phone: null, orderCount: 3 });
	});
	it('maps order rows only when the backend supplies a usable order identifier', () => {
		expect(CustomerMapper.fromOrder({ so_id: 0, so_number: 'SO-0' })).toBeNull();
		expect(CustomerMapper.fromOrder({ so_id: 7, so_number: 'SO-7', warehouse_id: 2 })).toMatchObject({ id: 7, number: 'SO-7', warehouseId: 2 });
	});
});
