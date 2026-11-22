import type { ReceiptHistoryEntry, UnreceiveResult } from '../entity/ReceiptHistory';
import type {
	CancelReceiptsResult,
	PurchaseOrderDetail,
	ReceiveLineInput,
	ReceiveResult
} from '../entity/PurchaseOrder';

export interface ReceivingRepository {
	/** GET /api/admin/purchase-orders/{poId}/receipts (requires receiving grant). */
	listReceipts(poId: number): Promise<ReceiptHistoryEntry[]>;

	/** POST /api/admin/receipts/{receiptId}/unreceive (single receipt, optional reason). */
	unreceive(receiptId: number, reason?: string): Promise<UnreceiveResult>;

	/** GET /api/receiving/po/{barcode} */
	lookupByBarcode(barcode: string): Promise<PurchaseOrderDetail>;

	/** POST /api/receiving/receive */
	receive(poId: number, items: ReceiveLineInput[]): Promise<ReceiveResult>;

	/** POST /api/receiving/cancel */
	cancelReceipts(poId: number, receiptIds: number[]): Promise<CancelReceiptsResult>;
}
