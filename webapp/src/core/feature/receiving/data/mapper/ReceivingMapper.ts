import type {
	CancelReceiptsResult,
	PoLineStatus,
	PurchaseOrder,
	PurchaseOrderDetail,
	PurchaseOrderLine,
	PurchaseOrderStatus,
	ReceivePurchaseOrderStatus,
	ReceiveResult
} from '../../domain/entity/PurchaseOrder';
import type {
	CancelResponseDto,
	PurchaseOrderDto,
	PurchaseOrderLineDto,
	PurchaseOrderLookupDto,
	ReceiveResponseDto
} from '../dto/ReceivingDto';

const purchaseOrderStatuses: readonly PurchaseOrderStatus[] = [
	'OPEN',
	'PARTIAL',
	'RECEIVED'
];

const poLineStatuses: readonly PoLineStatus[] = ['PENDING', 'PARTIAL', 'RECEIVED'];
const receivePurchaseOrderStatuses: readonly ReceivePurchaseOrderStatus[] = [
	'PARTIAL',
	'RECEIVED'
];

function assertPurchaseOrderStatus(status: string): PurchaseOrderStatus {
	if (purchaseOrderStatuses.includes(status as PurchaseOrderStatus)) return status as PurchaseOrderStatus;
	throw new Error(`Unsupported receiving purchase-order status: ${status}`);
}

function assertPoLineStatus(status: string): PoLineStatus {
	if (poLineStatuses.includes(status as PoLineStatus)) return status as PoLineStatus;
	throw new Error(`Unsupported receiving PO-line status: ${status}`);
}

function assertReceivePurchaseOrderStatus(status: string): ReceivePurchaseOrderStatus {
	if (receivePurchaseOrderStatuses.includes(status as ReceivePurchaseOrderStatus)) {
		return status as ReceivePurchaseOrderStatus;
	}
	throw new Error(`Unsupported receiving submission PO status: ${status}`);
}

export const ReceivingMapper = {
	toPurchaseOrder(dto: PurchaseOrderDto): PurchaseOrder {
		return {
			poId: dto.po_id,
			poNumber: dto.po_number,
			poBarcode: dto.po_barcode,
			vendorName: dto.vendor_name,
			status: assertPurchaseOrderStatus(dto.status),
			warehouseId: dto.warehouse_id,
			expectedDate: dto.expected_date,
			notes: dto.notes,
			createdAt: dto.created_at
		};
	},

	toLine(dto: PurchaseOrderLineDto): PurchaseOrderLine {
		return {
			poLineId: dto.po_line_id,
			lineNumber: dto.line_number,
			itemId: dto.item_id,
			sku: dto.sku,
			itemName: dto.item_name,
			upc: dto.upc,
			mpn: dto.mpn,
			quantityOrdered: dto.quantity_ordered,
			quantityReceived: dto.quantity_received,
			quantityRemaining: dto.quantity_remaining,
			status: assertPoLineStatus(dto.status)
		};
	},

	toDetail(dto: PurchaseOrderLookupDto): PurchaseOrderDetail {
		return {
			purchaseOrder: ReceivingMapper.toPurchaseOrder(dto.purchase_order),
			lines: dto.lines.map(ReceivingMapper.toLine)
		};
	},

	toReceiveResult(dto: ReceiveResponseDto): ReceiveResult {
		return {
			message: dto.message,
			receiptIds: dto.receipt_ids,
			poStatus: assertReceivePurchaseOrderStatus(dto.po_status),
			warnings: dto.warnings
		};
	},

	toCancelResult(dto: CancelResponseDto): CancelReceiptsResult {
		return {
			message: dto.message,
			reversed: dto.reversed
		};
	}
};
