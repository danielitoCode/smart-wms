import type { Customer, CustomerAddress, CustomerOrder } from '../../domain/entity/Customer';
import type { SalesOrderCustomerDto, SearchCustomerHitDto } from '../dto/CustomerDto';

export function customerKey(name: string): string {
	return name.trim().toLocaleLowerCase();
}

function address(
	kind: CustomerAddress['kind'],
	row: SalesOrderCustomerDto,
	warehouseId: number | null
): CustomerAddress | null {
	const prefix = kind === 'billing' ? 'billing' : kind === 'shipping' ? 'shipping' : 'customer';
	const line1 = kind === 'customer' ? row.customer_address : kind === 'shipping' ? (row.shipping_address_line1 ?? row.ship_address) : row.billing_address_line1;
	const line2 = kind === 'customer' ? null : row[`${prefix}_address_line2` as keyof SalesOrderCustomerDto] as string | null | undefined;
	const city = kind === 'customer' ? null : row[`${prefix}_address_city` as keyof SalesOrderCustomerDto] as string | null | undefined;
	const state = kind === 'customer' ? null : row[`${prefix}_address_state` as keyof SalesOrderCustomerDto] as string | null | undefined;
	const postalCode = kind === 'customer' ? null : row[`${prefix}_address_postal_code` as keyof SalesOrderCustomerDto] as string | null | undefined;
	const country = kind === 'customer' ? null : row[`${prefix}_address_country` as keyof SalesOrderCustomerDto] as string | null | undefined;
	const phone = kind === 'customer' ? row.customer_phone : row[`${prefix}_address_phone` as keyof SalesOrderCustomerDto] as string | null | undefined;
	const lines = [line1, line2].map((v) => (v ?? '').trim()).filter(Boolean);
	if (!lines.length && !city && !state && !postalCode && !country && !phone) return null;
	return { kind, lines, city: city ?? null, state: state ?? null, postalCode: postalCode ?? null, country: country ?? null, phone: phone ?? null, warehouseId };
}

function mergeCustomer(target: Customer, row: SalesOrderCustomerDto): void {
	const wid = row.warehouse_id ?? null;
	if (wid != null && !target.warehouseIds.includes(wid)) target.warehouseIds.push(wid);
	if (!target.phone && row.customer_phone) target.phone = row.customer_phone;
	for (const kind of ['customer', 'billing', 'shipping'] as const) {
		const candidate = address(kind, row, wid);
		if (!candidate) continue;
		const key = JSON.stringify([candidate.kind, candidate.lines, candidate.city, candidate.state, candidate.postalCode, candidate.country]);
		const existing = target.addresses.find((item) =>
			JSON.stringify([item.kind, item.lines, item.city, item.state, item.postalCode, item.country]) === key
		);
		if (!existing) target.addresses.push(candidate);
		else if (!existing.phone && candidate.phone) existing.phone = candidate.phone;
	}
}

export const CustomerMapper = {
	fromSearchHit(hit: SearchCustomerHitDto): Customer | null {
		const name = (hit.label ?? '').trim();
		if (!name) return null;
		const match = (hit.sublabel ?? '').match(/(\d+)\s+orders?/i);
		return {
			id: customerKey(name), name, email: null, phone: null,
			orderCount: match ? Number(match[1]) : null,
			warehouseIds: [], addresses: []
		};
	},

	fromSalesOrderProjection(rows: SalesOrderCustomerDto[]): Customer[] {
		const map = new Map<string, Customer>();
		for (const row of rows) {
			const name = (row.customer_name ?? '').trim();
			if (!name) continue;
			const key = customerKey(name);
			let customer = map.get(key);
			if (!customer) {
				customer = { id: key, name, email: null, phone: null, orderCount: 0, warehouseIds: [], addresses: [] };
				map.set(key, customer);
			}
			customer.orderCount = (customer.orderCount ?? 0) + 1;
			mergeCustomer(customer, row);
		}
		return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
	},

	fromOrder(row: SalesOrderCustomerDto): CustomerOrder | null {
		if (!Number.isInteger(row.so_id) || !row.so_id || !row.so_number) return null;
		return {
			id: row.so_id,
			number: row.so_number,
			status: row.status ?? null,
			orderDate: row.order_date ?? null,
			orderTotal: row.order_total ?? null,
			warehouseId: row.warehouse_id ?? null
		};
	},

	mergeDetail(customer: Customer, detail: { customer_email?: string | null; customer_phone?: string | null }): Customer {
		return {
			...customer,
			email: detail.customer_email ?? null,
			phone: customer.phone ?? detail.customer_phone ?? null
		};
	}
};
