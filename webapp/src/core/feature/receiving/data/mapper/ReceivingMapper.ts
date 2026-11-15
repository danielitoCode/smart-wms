import type {
	CancelReceiptsResult,
	PoLineStatus,
	PurchaseOrder,
	PurchaseOrderDetail,
	PurchaseOrderLine,
	PurchaseOrderStatus,
	ReceivePurchaseOrderStatus,
	ReceiveResult,
	ReceiptHistoryItem,
	ReceivingBin,
	UnreceiveResult
} from '../../domain/entity/PurchaseOrder';
import type {
	CancelResponseDto,
	PurchaseOrderDto,
	PurchaseOrderLineDto,
	PurchaseOrderLookupDto,
	ReceiveResponseDto,
	ReceiptHistoryItemDto,
	ReceivingBinDto,
	UnreceiveResponseDto
} from '../dto/ReceivingDto';

const purchaseOrderStatuses: readonly PurchaseOrderStatus[] = ['OPEN', 'PARTIAL', 'RECEIVED'];
const poLineStatuses: readonly PoLineStatus[] = ['PENDING', 'PARTIAL', 'RECEIVED'];
const receivePurchaseOrderStatuses: readonly ReceivePurchaseOrderStatus[] = ['PARTIAL', 'RECEIVED'];

function assertStatus<T extends string>(status: string, allowed: readonly T[], label: string): T {
	if (allowed.includes(status as T)) return status as T;
	throw new Error(`Unsupported ${label}: ${status}`);
}

export const ReceivingMapper = {
	toPurchaseOrder(dto: PurchaseOrderDto): PurchaseOrder {
		return {
			poId: dto.po_id,
			poNumber: dto.po_number,
			poBarcode: dto.po_barcode,
			vendorName: dto.vendor_name,
			status: assertStatus(dto.status, purchaseOrderStatuses, 'receiving purchase-order status'),
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
			status: assertStatus(dto.status, poLineStatuses, 'receiving PO-line status')
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
			poStatus: assertStatus(dto.po_status, receivePurchaseOrderStatuses, 'receive submission PO status'),
			warnings: dto.warnings ?? []
		};
	},
	toCancelResult(dto: CancelResponseDto): CancelReceiptsResult {
		return { message: dto.message, reversed: dto.reversed };
	},
	toBin(dto: ReceivingBinDto): ReceivingBin {
		return { binId: dto.bin_id, binCode: dto.bin_code, binType: dto.bin_type, isActive: dto.is_active };
	},
	toReceipt(dto: ReceiptHistoryItemDto): ReceiptHistoryItem {
		return {
			receiptId: dto.receipt_id,
			poLineId: dto.po_line_id,
			lineNumber: dto.line_number,
			itemId: dto.item_id,
			sku: dto.sku,
			itemName: dto.item_name,
			quantityReceived: dto.quantity_received,
			binId: dto.bin_id,
			binCode: dto.bin_code,
			warehouseId: dto.warehouse_id,
			receivedBy: dto.received_by,
			receivedAt: dto.received_at,
			lotNumber: dto.lot_number,
			serialNumber: dto.serial_number,
			notes: dto.notes,
			externalId: dto.external_id
		};
	},
	toUnreceiveResult(dto: UnreceiveResponseDto): UnreceiveResult {
		return {
			message: dto.message,
			receiptId: dto.receipt_id,
			poId: dto.po_id,
			poStatus: dto.po_status,
			quantityReversed: dto.quantity_reversed,
			binDecrements: dto.bin_decrements.map((entry) => ({
				binId: entry.bin_id,
				quantity: entry.quantity
			}))
		};
	}
};
