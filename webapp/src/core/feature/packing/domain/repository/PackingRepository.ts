import type {
	PackingOrderDetail,
	SimpleMessageResult,
	VerifyPackInput
} from '../entity/Packing';

export interface PackingRepository {
	/** GET /api/packing/order/{barcode} */
	loadOrder(barcode: string, warehouseId: number): Promise<PackingOrderDetail>;
	/** POST /api/packing/verify */
	verify(input: VerifyPackInput): Promise<SimpleMessageResult>;
	/** POST /api/packing/complete */
	complete(soId: number, warehouseId: number): Promise<SimpleMessageResult>;
}
