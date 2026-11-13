import type { SalesOrder, SalesOrderLine } from '../../domain/entity/SalesOrder';
import type { SalesOrderDto, SalesOrderLineDto } from '../dto/SalesOrderDto';

function toLine(dto: SalesOrderLineDto): SalesOrderLine {
	return {
		lineId: dto.line_id ?? dto.id ?? null,
		lineNumber: dto.line_number ?? null,
		itemId: dto.item_id ?? null,
		sku: dto.sku ?? '',
		itemName: dto.item_name ?? dto.name ?? '',
		quantityOrdered: Number(dto.quantity_ordered ?? dto.qty_ordered ?? 0),
		quantityAllocated: Number(dto.quantity_allocated ?? 0),
		quantityPicked: Number(dto.quantity_picked ?? 0),
		quantityPacked: Number(dto.quantity_packed ?? 0),
		quantityShipped: Number(dto.quantity_shipped ?? 0),
		quantityReceived: Number(dto.quantity_received ?? 0)
	};
}

export const SalesOrderMapper = {
	toDomain(dto: SalesOrderDto): SalesOrder {
		return {
			id: dto.so_id ?? dto.id ?? 0,
			soNumber: dto.so_number ?? '',
			barcode: dto.so_barcode ?? dto.barcode ?? null,
			status: dto.status ?? 'OPEN',
			warehouseId: dto.warehouse_id ?? null,
			customerId: dto.customer_id ?? null,
			customerName: dto.customer_name ?? '',
			customerEmail: dto.customer_email ?? null,
			customerPhone: dto.customer_phone ?? null,
			customerAddress: dto.customer_address ?? null,
			shipAddress: dto.ship_address ?? null,
			shipMethod: dto.ship_method ?? null,
			orderType: dto.order_type ?? null,
			orderOrigin: dto.order_origin ?? null,
			parentSoId: dto.parent_so_id ?? null,
			parentSoNumber: dto.parent_so_number ?? null,
			memo: dto.memo ?? null,
			orderTotal: dto.order_total ?? null,
			customerShippingPaid: dto.customer_shipping_paid ?? null,
			lines: Array.isArray(dto.lines) ? dto.lines.map(toLine) : [],
			createdAt: dto.created_at ?? null,
			pickedAt: dto.picked_at ?? null,
			shippedAt: dto.shipped_at ?? null
		};
	}
};
