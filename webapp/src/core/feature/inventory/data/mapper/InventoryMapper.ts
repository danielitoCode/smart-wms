import type { InventoryPage, InventoryStock } from '../../domain/entity/InventoryStock';
import type {
	CycleCountDetail,
	CycleCountLine,
	CycleCountSubmitResult,
	CycleCountSummary
} from '../../domain/entity/CycleCount';
import type {
	CycleCountDetailDto,
	CycleCountLineDto,
	CycleCountSubmitResponseDto,
	CycleCountSummaryDto,
	InventoryOverviewDto,
	InventoryRowDto
} from '../dto/InventoryDto';

export const InventoryMapper = {
	toStock(dto: InventoryRowDto): InventoryStock {
		return {
			inventoryId: dto.inventory_id,
			itemId: dto.item_id,
			binId: dto.bin_id,
			...(dto.warehouse_id != null ? { warehouseId: dto.warehouse_id } : {}),
			quantityOnHand: dto.quantity_on_hand,
			quantityAllocated: dto.quantity_allocated,
			quantityAvailable: dto.quantity_available,
			committedToOrders: dto.committed_to_orders,
			lotNumber: dto.lot_number,
			sku: dto.sku,
			itemName: dto.item_name,
			binCode: dto.bin_code,
			zoneName: dto.zone_name,
			lastCountedAt: dto.last_counted_at
		};
	},

	toOverview(dto: InventoryOverviewDto): InventoryPage {
		return {
			items: (dto.inventory ?? []).map(InventoryMapper.toStock),
			page: dto.page,
			perPage: dto.per_page,
			total: dto.total,
			pages: dto.pages
		};
	},

	toCycleCountSummary(dto: CycleCountSummaryDto): CycleCountSummary {
		return {
			countId: dto.count_id,
			binId: dto.bin_id,
			binCode: dto.bin_code,
			status: dto.status,
			lines: dto.lines,
			assignedTo: dto.assigned_to ?? null
		};
	},

	toCycleCountLine(dto: CycleCountLineDto): CycleCountLine {
		return {
			countLineId: dto.count_line_id,
			itemId: dto.item_id,
			sku: dto.sku ?? null,
			expectedQuantity: dto.expected_quantity ?? null,
			countedQuantity: dto.counted_quantity ?? null
		};
	},

	toCycleCountDetail(dto: CycleCountDetailDto): CycleCountDetail {
		const header = dto.cycle_count;
		return {
			countId: header?.count_id ?? dto.count_id ?? 0,
			binId: header?.bin_id ?? dto.bin_id ?? 0,
			binCode: header?.bin_code ?? dto.bin_code ?? '',
			status: header?.status ?? dto.status ?? 'PENDING',
			lines: (dto.lines ?? []).map(InventoryMapper.toCycleCountLine)
		};
	},

	toSubmitResult(dto: CycleCountSubmitResponseDto): CycleCountSubmitResult {
		const summary = dto.summary;
		return {
			status: dto.status,
			totalLines: summary?.total_lines ?? 0,
			linesWithVariance: summary?.lines_with_variance ?? 0,
			adjustments: (summary?.adjustments ?? []).map((a) => ({
				sku: a.sku,
				expected: a.expected,
				counted: a.counted,
				variance: a.variance,
				adjustmentId: a.adjustment_id
			}))
		};
	}
};
