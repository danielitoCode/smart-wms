import { ReceiptHistoryMapper } from '../dto/ReceiptHistoryDto';
import type { ReceivingRepository } from '../../domain/repository/ReceivingRepository';
import type {
	CancelReceiptsResult,
	PurchaseOrderDetail,
	ReceiveLineInput,
	ReceiveResult
} from '../../domain/entity/PurchaseOrder';
import type { ReceivingRemoteDataSource } from '../datasource/ReceivingRemoteDataSource';
import { ReceivingMapper } from '../mapper/ReceivingMapper';

export class ReceivingRepositoryImpl implements ReceivingRepository {
	constructor(private readonly datasource: ReceivingRemoteDataSource) {}

	async listReceipts(poId: number) {
		const dto = await this.datasource.listReceipts(poId);
		return dto.receipts.map(ReceiptHistoryMapper.toEntry);
	}

	async unreceive(receiptId: number, reason?: string) {
		const dto = await this.datasource.unreceive(receiptId, reason);
		return ReceiptHistoryMapper.toUnreceiveResult(dto);
	}

	async lookupByBarcode(barcode: string): Promise<PurchaseOrderDetail> {
		const dto = await this.datasource.lookupByBarcode(barcode);
		return ReceivingMapper.toDetail(dto);
	}

	async receive(poId: number, items: ReceiveLineInput[]): Promise<ReceiveResult> {
		const dto = await this.datasource.receive(poId, items);
		return ReceivingMapper.toReceiveResult(dto);
	}

	async cancelReceipts(poId: number, receiptIds: number[]): Promise<CancelReceiptsResult> {
		const dto = await this.datasource.cancelReceipts(poId, receiptIds);
		return ReceivingMapper.toCancelResult(dto);
	}
}
