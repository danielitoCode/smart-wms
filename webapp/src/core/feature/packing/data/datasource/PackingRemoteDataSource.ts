import type { ApiClient } from '#core/infrastructure/api/ApiClient.ts';
import type { VerifyPackInput } from '../../domain/entity/Packing';
import type { CompletePackingResponseDto, PackingOrderResponseDto, VerifyPackResponseDto } from '../dto/PackingDto';

export class PackingRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	loadOrder(barcode: string, warehouseId: number): Promise<PackingOrderResponseDto> {
		return this.api.get<PackingOrderResponseDto>(
			`/api/packing/order/${encodeURIComponent(barcode)}?warehouse_id=${warehouseId}`
		);
	}

	verify(input: VerifyPackInput): Promise<VerifyPackResponseDto> {
		return this.api.post<VerifyPackResponseDto>('/api/packing/verify', {
			so_id: input.soId,
			scanned_barcode: input.scannedBarcode,
			quantity: input.quantity ?? 1
		});
	}

	complete(soId: number): Promise<CompletePackingResponseDto> {
		return this.api.post<CompletePackingResponseDto>('/api/packing/complete', { so_id: soId });
	}
}
