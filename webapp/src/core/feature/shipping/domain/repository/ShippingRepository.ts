import type {
	FulfillShipmentInput,
	FulfillShipmentResult,
	ShippingOrderDetail
} from '../entity/Shipping';

export interface ShippingRepository {
	loadOrder(barcode: string): Promise<ShippingOrderDetail>;
	fulfill(input: FulfillShipmentInput): Promise<FulfillShipmentResult>;
}
