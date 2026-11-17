import type {
	FulfillShipmentResult,
	ShippingOrderDetail
} from '../../domain/entity/Shipping';
import type { FulfillResponseDto, ShippingOrderResponseDto } from '../dto/ShippingDto';

export const ShippingMapper = {
	toDetail(dto: ShippingOrderResponseDto): ShippingOrderDetail {
		const lines = dto.lines.map((line) => ({
			soLineId: line.so_line_id,
			lineNumber: line.line_number,
			itemId: line.item_id,
			sku: line.sku,
			quantity: line.quantity_picked,
			itemName: line.item_name,
			quantityOrdered: line.quantity_ordered,
			quantityPicked: line.quantity_picked,
			quantityPacked: line.quantity_packed
		}));
		return {
			salesOrder: {
				soId: dto.sales_order.so_id,
				soNumber: dto.sales_order.so_number,
				soBarcode: dto.sales_order.so_barcode,
				customerName: dto.sales_order.customer_name,
				status: dto.sales_order.status,
				shipMethod: dto.sales_order.ship_method,
				shipAddress: dto.sales_order.ship_address,
				warehouseId: dto.sales_order.warehouse_id,
				memo: dto.sales_order.memo
			},
			lines,
			totalItems: dto.total_items,
			totalLines: dto.total_lines
		};
	},

	toFulfillResult(dto: FulfillResponseDto): FulfillShipmentResult {
		return {
			message: dto.message,
			fulfillmentId: dto.fulfillment_id,
			soNumber: dto.so_number,
			trackingNumber: dto.tracking_number,
			carrier: dto.carrier,
			shipMethod: dto.ship_method ?? null,
			linesShipped: dto.lines_shipped,
			totalQuantity: dto.total_quantity
		};
	}
};
