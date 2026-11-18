import type { Customer } from '../../domain/entity/Customer';
import type { SalesOrderCustomerDto, SearchCustomerHitDto } from '../dto/CustomerDto';

function keyFrom(name: string, customerId: string | null | undefined): string {
	if (customerId && String(customerId).trim()) return String(customerId).trim();
	return `name:${name.trim().toLowerCase()}`;
}

export const CustomerMapper = {
	fromSearchHit(hit: SearchCustomerHitDto): Customer | null {
		const name = (hit.label ?? hit.customer_name ?? '').trim();
		if (!name) return null;
		const id = hit.customer_id ?? (hit.id != null ? String(hit.id) : null);
		const orderCount = (() => {
			const sub = hit.sublabel ?? '';
			const m = sub.match(/(\d+)\s*order/i);
			return m ? Number(m[1]) : null;
		})();
		return {
			id: keyFrom(name, id),
			name,
			email: null,
			phone: null,
			orderCount,
			warehouseId: null
		};
	},

	fromSalesOrderProjection(
		rows: SalesOrderCustomerDto[],
		warehouseId?: number
	): Customer[] {
		const map = new Map<string, Customer>();
		for (const row of rows) {
			const name = (row.customer_name ?? '').trim();
			if (!name) continue;
			if (warehouseId != null && row.warehouse_id != null && row.warehouse_id !== warehouseId) {
				continue;
			}
			const id = keyFrom(name, row.customer_id);
			const existing = map.get(id);
			if (existing) {
				existing.orderCount = (existing.orderCount ?? 0) + 1;
				if (!existing.email && row.customer_email) existing.email = row.customer_email;
				if (!existing.phone && row.customer_phone) existing.phone = row.customer_phone;
			} else {
				map.set(id, {
					id,
					name,
					email: row.customer_email ?? null,
					phone: row.customer_phone ?? null,
					orderCount: 1,
					warehouseId: row.warehouse_id ?? warehouseId ?? null
				});
			}
		}
		return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
	}
};
