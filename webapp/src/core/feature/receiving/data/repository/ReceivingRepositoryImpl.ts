import type { ReceivingRepository } from '../../domain/repository/ReceivingRepository';
import type {
	CancelReceiptsResult,
	PurchaseOrderDetail,
	ReceiveLineInput,
	ReceiveResult,
	ReceiptHistoryItem,
	ReceivingBin,
	UnreceiveResult
} from '../../domain/entity/PurchaseOrder';
import type { ReceivingRemoteDataSource } from '../datasource/ReceivingRemoteDataSource';
import { ReceivingMapper } from '../mapper/ReceivingMapper';

export class ReceivingRepositoryImpl implements ReceivingRepository {
	constructor(private readonly datasource: ReceivingRemoteDataSource) {}

	async lookupByBarcode(barcode: string): Promise<PurchaseOrderDetail> {
		return ReceivingMapper.toDetail(await this.datasource.lookupByBarcode(barcode));
	}
	async receive(poId: number, items: ReceiveLineInput[]): Promise<ReceiveResult> {
		return ReceivingMapper.toReceiveResult(await this.datasource.receive(poId, items));
	}
	async cancelReceipts(poId: number, receiptIds: number[]): Promise<CancelReceiptsResult> {
		return ReceivingMapper.toCancelResult(await this.datasource.cancelReceipts(poId, receiptIds));
	}
	async listReceipts(poId: number): Promise<ReceiptHistoryItem[]> {
		const response = await this.datasource.listReceipts(poId);
		return response.receipts.map(ReceivingMapper.toReceipt);
	}
	async listBins(warehouseId: number): Promise<ReceivingBin[]> {
		const response = await this.datasource.listBins(warehouseId);
		return response.bins.map(ReceivingMapper.toBin).filter((bin) => bin.isActive);
	}
	async unreceiveReceipt(receiptId: number, reason?: string): Promise<UnreceiveResult> {
		return ReceivingMapper.toUnreceiveResult(await this.datasource.unreceiveReceipt(receiptId, reason));
	}
}
