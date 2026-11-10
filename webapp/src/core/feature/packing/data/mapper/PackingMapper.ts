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
				status: dto.sales_order.status
			},
			lines: (dto.lines ?? []).map((line) => ({
				sku: line.sku,
				quantityPicked: line.quantity_picked,
				quantityPacked: line.quantity_packed,
				packVerified: line.pack_verified
			})),
			calculatedWeightLbs: dto.calculated_weight_lbs ?? 0,
			totalItems: dto.total_items ?? 0,
			itemsVerified: dto.items_verified ?? 0
		};
	},

	toMessage(dto: MessageDto): SimpleMessageResult {
		return { message: dto.message };
	}
};
