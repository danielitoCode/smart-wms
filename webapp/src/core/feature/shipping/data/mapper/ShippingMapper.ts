import type {
	FulfillShipmentResult,
	ShippingOrderDetail
} from '../../domain/entity/Shipping';
import type { FulfillResponseDto, ShippingOrderResponseDto } from '../dto/ShippingDto';

export const ShippingMapper = {
	toDetail(dto: ShippingOrderResponseDto): ShippingOrderDetail {
		const lines = (dto.lines ?? []).map((line) => ({
			sku: line.sku,
			quantity: line.quantity ?? line.qty ?? line.quantity_ordered ?? 0,
			itemName: line.item_name
		}));
		return {
			salesOrder: {
				soId: dto.sales_order.so_id,
				soNumber: dto.sales_order.so_number,
				status: dto.sales_order.status
			},
			lines,
			totalItems: dto.total_items ?? lines.reduce((s, l) => s + l.quantity, 0),
			totalLines: dto.total_lines ?? lines.length
		};
	},

	toFulfillResult(dto: FulfillResponseDto): FulfillShipmentResult {
		return {
			message: dto.message,
			fulfillmentId: dto.fulfillment_id,
			soNumber: dto.so_number,
			trackingNumber: dto.tracking_number,
			carrier: dto.carrier,
			linesShipped: dto.lines_shipped ?? 0,
			totalQuantity: dto.total_quantity ?? 0
		};
	}
};
