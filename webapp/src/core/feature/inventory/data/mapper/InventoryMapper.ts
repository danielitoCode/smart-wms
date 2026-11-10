import type { InventoryStock } from '../../domain/entity/InventoryStock';
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
	InventoryRowDto
} from '../dto/InventoryDto';

export const InventoryMapper = {
	toStock(dto: InventoryRowDto): InventoryStock {
		return {
			inventoryId: dto.inventory_id ?? dto.id ?? 0,
			itemId: dto.item_id,
			binId: dto.bin_id,
			warehouseId: dto.warehouse_id,
			quantityOnHand: dto.quantity_on_hand,
			lotNumber: dto.lot_number ?? null,
			sku: dto.sku ?? null,
			itemName: dto.item_name ?? null,
			binCode: dto.bin_code ?? null
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
		return {
			countId: dto.count_id,
			binId: dto.bin_id,
			binCode: dto.bin_code,
			status: dto.status,
			lines: (dto.lines ?? []).map(InventoryMapper.toCycleCountLine)
		};
	},

	toSubmitResult(dto: CycleCountSubmitResponseDto): CycleCountSubmitResult {
		const summary = dto.summary;
		return {
			status: dto.status,
			totalLines: summary.total_lines,
			linesWithVariance: summary.lines_with_variance,
			adjustments: (summary.adjustments ?? []).map((a) => ({
				sku: a.sku,
				expected: a.expected,
				counted: a.counted,
				variance: a.variance,
				adjustmentId: a.adjustment_id
			}))
		};
	}
};
