import type { InventoryPage, InventoryQuery } from '../entity/InventoryStock';
import type {
	CycleCountDetail,
	CycleCountSubmitLine,
	CycleCountSubmitResult,
	CycleCountSummary
} from '../entity/CycleCount';

/** Domain port for the inventory read model and cycle-count operations. */
export interface InventoryRepository {
	/** GET /api/admin/inventory */
	getOverview(params?: InventoryQuery): Promise<InventoryPage>;
	/** Uses the same endpoint's item_id filter; no parallel item-stock API is assumed. */
	getItemInventory(itemId: number, params?: Omit<InventoryQuery, 'itemId'>): Promise<InventoryPage>;
	createCycleCounts(warehouseId: number, binIds: number[]): Promise<CycleCountSummary[]>;
	getCycleCount(countId: number): Promise<CycleCountDetail>;
	submitCycleCount(countId: number, lines: CycleCountSubmitLine[]): Promise<CycleCountSubmitResult>;
}
