import type { ShippingRepository } from '../../domain/repository/ShippingRepository';
import type {
	FulfillShipmentInput,
	FulfillShipmentResult,
	ShippingOrderDetail
} from '../../domain/entity/Shipping';
import type { ShippingRemoteDataSource } from '../datasource/ShippingRemoteDataSource';
import { ShippingMapper } from '../mapper/ShippingMapper';

export class ShippingRepositoryImpl implements ShippingRepository {
	constructor(private readonly datasource: ShippingRemoteDataSource) {}

	async loadOrder(barcode: string): Promise<ShippingOrderDetail> {
		return ShippingMapper.toDetail(await this.datasource.loadOrder(barcode));
	}

	async fulfill(input: FulfillShipmentInput): Promise<FulfillShipmentResult> {
		return ShippingMapper.toFulfillResult(await this.datasource.fulfill(input));
	}
}
