import type {
	PackingOrderDetail,
	SimpleMessageResult,
	VerifyPackInput
} from '../entity/Packing';

export interface PackingRepository {
	/** GET /api/packing/order/{barcode} */
	loadOrder(barcode: string): Promise<PackingOrderDetail>;
	/** POST /api/packing/verify */
	verify(input: VerifyPackInput): Promise<SimpleMessageResult>;
	/** POST /api/packing/complete */
	complete(soId: number): Promise<SimpleMessageResult>;
}
