import type {
	CancelReceiptsResult,
	PurchaseOrder,
	PurchaseOrderDetail,
	PurchaseOrderLine,
	ReceiveResult
} from '../../domain/entity/PurchaseOrder';
import type {
	CancelResponseDto,
	PurchaseOrderDto,
	PurchaseOrderLineDto,
	PurchaseOrderLookupDto,
	ReceiveResponseDto
} from '../dto/ReceivingDto';

export const ReceivingMapper = {
	toPurchaseOrder(dto: PurchaseOrderDto): PurchaseOrder {
		return {
			poId: dto.po_id,
			poNumber: dto.po_number,
			vendorName: dto.vendor_name,
			status: dto.status,
			warehouseId: dto.warehouse_id
		};
	},

	toLine(dto: PurchaseOrderLineDto): PurchaseOrderLine {
		return {
			poLineId: dto.po_line_id,
			itemId: dto.item_id,
			sku: dto.sku,
			itemName: dto.item_name,
			upc: dto.upc ?? null,
			quantityOrdered: dto.quantity_ordered,
			quantityReceived: dto.quantity_received,
			quantityRemaining: dto.quantity_remaining,
			status: dto.status
		};
	},

	toDetail(dto: PurchaseOrderLookupDto): PurchaseOrderDetail {
		return {
			purchaseOrder: ReceivingMapper.toPurchaseOrder(dto.purchase_order),
			lines: (dto.lines ?? []).map(ReceivingMapper.toLine)
		};
	},

	toReceiveResult(dto: ReceiveResponseDto): ReceiveResult {
		return {
			message: dto.message,
			receiptIds: dto.receipt_ids ?? [],
			poStatus: dto.po_status,
			warnings: dto.warnings ?? []
		};
	},

	toCancelResult(dto: CancelResponseDto): CancelReceiptsResult {
		return {
			message: dto.message,
			reversed: dto.reversed
		};
	}
};
