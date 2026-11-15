import type {
	CancelReceiptsResult,
	PurchaseOrderDetail,
	ReceiveLineInput,
	ReceiveResult,
	ReceiptHistoryItem,
	ReceivingBin,
	UnreceiveResult
} from '../entity/PurchaseOrder';

export interface ReceivingRepository {
	lookupByBarcode(barcode: string): Promise<PurchaseOrderDetail>;
	receive(poId: number, items: ReceiveLineInput[]): Promise<ReceiveResult>;
	cancelReceipts(poId: number, receiptIds: number[]): Promise<CancelReceiptsResult>;
	listReceipts(poId: number): Promise<ReceiptHistoryItem[]>;
	listBins(warehouseId: number): Promise<ReceivingBin[]>;
	unreceiveReceipt(receiptId: number, reason?: string): Promise<UnreceiveResult>;
}
