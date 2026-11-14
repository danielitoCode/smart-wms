import type {
	InventoryAdjustment,
	CreateInventoryAdjustment,
	InventoryAdjustmentDecision
} from '../entity/InventoryAdjustment';

export type AdjustmentListQuery = {
	warehouseId?: number | null;
	status?: InventoryAdjustment['status'] | null;
	page?: number;
	perPage?: number;
};

export interface InventoryAdjustmentsRepository {
	list(query?: AdjustmentListQuery): Promise<InventoryAdjustment[]>;
	pending(query?: Omit<AdjustmentListQuery, 'status'>): Promise<InventoryAdjustment[]>;
	createDirect(input: CreateInventoryAdjustment): Promise<void>;
	review(decisions: InventoryAdjustmentDecision[]): Promise<void>;
}
