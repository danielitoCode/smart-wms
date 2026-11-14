import type { InventoryPage, InventoryStock } from '../../domain/entity/InventoryStock';
import type {
	CycleCountDetail,
	CycleCountLine,
	CycleCountStatus,
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

function toCycleCountStatus(status: string): CycleCountStatus {
	if (status === 'PENDING' || status === 'IN_PROGRESS' || status === 'COMPLETED' || status === 'VARIANCE') {
		return status;
	}
	throw new Error(`Unsupported cycle count status: ${status}`);
}

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

	toCycleCountSummary(dto: CycleCountSummaryDto, warehouseId: number): CycleCountSummary {
		return {
			countId: dto.count_id,
			warehouseId,
			binId: dto.bin_id,
			binCode: dto.bin_code,
			status: toCycleCountStatus(dto.status),
			lineCount: dto.lines,
			assignedTo: dto.assigned_to
		};
	},

	toCycleCountLine(dto: CycleCountLineDto): CycleCountLine {
		return {
			countLineId: dto.count_line_id,
			itemId: dto.item_id,
			sku: dto.sku,
			itemName: dto.item_name,
			upc: dto.upc,
			expectedQuantity: dto.expected_quantity,
			countedQuantity: dto.counted_quantity,
			variance: dto.variance,
			scanned: dto.scanned,
			unexpected: dto.unexpected
		};
	},

	toCycleCountDetail(dto: CycleCountDetailDto): CycleCountDetail {
		const header = dto.cycle_count;
		return {
			countId: header.count_id,
			warehouseId: header.warehouse_id,
			binId: header.bin_id,
			binCode: header.bin_code,
			binBarcode: header.bin_barcode,
			status: toCycleCountStatus(header.status),
			assignedTo: header.assigned_to,
			createdAt: header.created_at,
			showExpected: dto.show_expected,
			lines: dto.lines.map(InventoryMapper.toCycleCountLine)
		};
	},

	toSubmitResult(dto: CycleCountSubmitResponseDto): CycleCountSubmitResult {
		return {
			countId: dto.count_id,
			binCode: dto.bin_code,
			status: toCycleCountStatus(dto.status),
			totalLines: dto.summary.total_lines,
			linesMatched: dto.summary.lines_matched,
			linesWithVariance: dto.summary.lines_with_variance,
			adjustments: dto.summary.adjustments.map((adjustment) => ({
				sku: adjustment.sku,
				expected: adjustment.expected,
				counted: adjustment.counted,
				variance: adjustment.variance,
				adjustmentId: adjustment.adjustment_id,
				unexpected: adjustment.unexpected === true
			}))
		};
	}
};
