import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type { ReceiveLineInput } from '../../domain/entity/PurchaseOrder';
import type {
	CancelResponseDto,
	PurchaseOrderLookupDto,
	ReceiveResponseDto,
	ReceiptsResponseDto,
	ReceivingBinsResponseDto,
	UnreceiveResponseDto
} from '../dto/ReceivingDto';

export class ReceivingRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	lookupByBarcode(barcode: string): Promise<PurchaseOrderLookupDto> {
		return this.api.get<PurchaseOrderLookupDto>(
			`/api/receiving/po/${encodeURIComponent(barcode)}`
		);
	}

	receive(poId: number, items: ReceiveLineInput[]): Promise<ReceiveResponseDto> {
		return this.api.post<ReceiveResponseDto>('/api/receiving/receive', {
			po_id: poId,
			items: items.map((item) => ({
				item_id: item.itemId,
				quantity: item.quantity,
				bin_id: item.binId,
				...(item.lotNumber != null && item.lotNumber !== '' ? { lot_number: item.lotNumber } : {}),
				...(item.serialNumber != null && item.serialNumber !== '' ? { serial_number: item.serialNumber } : {}),
				...(item.notes != null && item.notes !== '' ? { notes: item.notes } : {})
			}))
		});
	}

	cancelReceipts(poId: number, receiptIds: number[]): Promise<CancelResponseDto> {
		return this.api.post<CancelResponseDto>('/api/receiving/cancel', {
			po_id: poId,
			receipt_ids: receiptIds
		});
	}

	async listReceipts(poId: number): Promise<ReceiptsResponseDto> {
		return this.api.get<ReceiptsResponseDto>(`/api/admin/purchase-orders/${poId}/receipts`);
	}

	async listBins(warehouseId: number): Promise<ReceivingBinsResponseDto> {
		return this.api.get<ReceivingBinsResponseDto>(
			`/api/admin/bins?warehouse_id=${warehouseId}&per_page=500`
		);
	}

	unreceiveReceipt(receiptId: number, reason?: string): Promise<UnreceiveResponseDto> {
		return this.api.post<UnreceiveResponseDto>(
			`/api/admin/receipts/${receiptId}/unreceive`,
			reason ? { reason } : {}
		);
	}
}
