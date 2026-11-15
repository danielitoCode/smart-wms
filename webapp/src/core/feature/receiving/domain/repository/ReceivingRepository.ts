import type {
	CancelReceiptsResult,
	PurchaseOrderDetail,
	ReceiveLineInput,
	ReceiveResult
} from '../entity/PurchaseOrder';

export interface ReceivingRepository {
	/** GET /api/receiving/po/{barcode} */
	lookupByBarcode(barcode: string): Promise<PurchaseOrderDetail>;

	/** POST /api/receiving/receive */
	receive(poId: number, items: ReceiveLineInput[]): Promise<ReceiveResult>;

	/** POST /api/receiving/cancel */
	cancelReceipts(poId: number, receiptIds: number[]): Promise<CancelReceiptsResult>;
}
