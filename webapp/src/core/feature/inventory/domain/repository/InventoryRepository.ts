import type { InventoryStock } from '../entity/InventoryStock';
import type {
	CycleCountDetail,
	CycleCountSubmitLine,
	CycleCountSubmitResult,
	CycleCountSummary
} from '../entity/CycleCount';

/**
 * Domain port for inventory operations.
 * Implementations live in the data layer and talk to the existing backend.
 */
export interface InventoryRepository {
	/**
	 * Inventory overview (admin surface).
	 * Backend: GET /api/admin/inventory?warehouse_id=&item_id=&page=
	 */
	getOverview(params?: {
		warehouseId?: number;
		itemId?: number;
		page?: number;
	}): Promise<InventoryStock[]>;

	/**
	 * Create cycle counts for bins.
	 * Backend: POST /api/inventory/cycle-count/create
	 */
	createCycleCounts(warehouseId: number, binIds: number[]): Promise<CycleCountSummary[]>;

	/**
	 * Load cycle count detail.
	 * Backend: GET /api/inventory/cycle-count/{count_id}
	 */
	getCycleCount(countId: number): Promise<CycleCountDetail>;

	/**
	 * Submit counted quantities.
	 * Backend: POST /api/inventory/cycle-count/submit
	 */
	submitCycleCount(countId: number, lines: CycleCountSubmitLine[]): Promise<CycleCountSubmitResult>;
}
