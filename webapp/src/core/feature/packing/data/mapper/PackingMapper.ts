import type {
	PackingOrderDetail,
	SimpleMessageResult,
	VerifyPackResult
} from '../../domain/entity/Packing';
import type { MessageDto, PackingOrderResponseDto, VerifyPackResponseDto } from '../dto/PackingDto';

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

	toVerifyResult(dto: VerifyPackResponseDto): VerifyPackResult {
		return {
			message: dto.message,
			item: { sku: dto.item.sku, itemName: dto.item.item_name, quantityVerified: dto.item.quantity_verified, lineComplete: dto.item.line_complete },
			orderProgress: { totalLines: dto.order_progress.total_lines, linesVerified: dto.order_progress.lines_verified, allVerified: dto.order_progress.all_verified }
		};
	},

	toMessage(dto: MessageDto): SimpleMessageResult {
		return { message: dto.message };
	}
};
