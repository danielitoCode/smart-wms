import type {
	PackingOrderDetail,
	SimpleMessageResult
} from '../../domain/entity/Packing';
import type { MessageDto, PackingOrderResponseDto } from '../dto/PackingDto';

export const PackingMapper = {
	toDetail(dto: PackingOrderResponseDto): PackingOrderDetail {
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
			lines: dto.lines.map((line) => ({
				soLineId: line.so_line_id,
				lineNumber: line.line_number,
				itemId: line.item_id,
				sku: line.sku,
				itemName: line.item_name,
				upc: line.upc ?? null,
				weightLbs: line.weight_lbs,
				quantityOrdered: line.quantity_ordered,
				quantityPicked: line.quantity_picked,
				quantityPacked: line.quantity_packed,
				packVerified: line.pack_verified
			})),
			calculatedWeightLbs: dto.calculated_weight_lbs,
			totalItems: dto.total_items,
			itemsVerified: dto.items_verified
		};
	},

	toMessage(dto: MessageDto): SimpleMessageResult {
		return { message: dto.message };
	}
};
