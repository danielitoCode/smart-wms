import type { ApiClient } from '#core/infrastructure/api/ApiClient.ts';
import type { VerifyPackInput } from '../../domain/entity/Packing';
import type { MessageDto, PackingOrderResponseDto } from '../dto/PackingDto';

export class PackingRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	loadOrder(barcode: string): Promise<PackingOrderResponseDto> {
		return this.api.get<PackingOrderResponseDto>(
			`/api/packing/order/${encodeURIComponent(barcode)}`
		);
	}

	verify(input: VerifyPackInput): Promise<MessageDto> {
		return this.api.post<MessageDto>('/api/packing/verify', {
			so_id: input.soId,
			scanned_barcode: input.scannedBarcode,
			quantity: input.quantity ?? 1
		});
	}

	complete(soId: number): Promise<MessageDto> {
		return this.api.post<MessageDto>('/api/packing/complete', { so_id: soId });
	}
}
