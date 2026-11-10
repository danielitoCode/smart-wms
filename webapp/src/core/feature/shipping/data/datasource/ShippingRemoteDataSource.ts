import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type { FulfillShipmentInput } from '../../domain/entity/Shipping';
import type { FulfillResponseDto, ShippingOrderResponseDto } from '../dto/ShippingDto';

export class ShippingRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	loadOrder(barcode: string): Promise<ShippingOrderResponseDto> {
		return this.api.get<ShippingOrderResponseDto>(
			`/api/shipping/order/${encodeURIComponent(barcode)}`
		);
	}

	fulfill(input: FulfillShipmentInput): Promise<FulfillResponseDto> {
		return this.api.post<FulfillResponseDto>('/api/shipping/fulfill', {
			so_id: input.soId,
			tracking_number: input.trackingNumber,
			carrier: input.carrier,
			...(input.shipMethod ? { ship_method: input.shipMethod } : {})
		});
	}
}
