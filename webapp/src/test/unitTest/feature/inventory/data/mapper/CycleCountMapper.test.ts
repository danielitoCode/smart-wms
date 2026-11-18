import { describe, expect, it } from 'vitest';
import { InventoryMapper } from '../../../../../../core/feature/inventory/data/mapper/InventoryMapper';
import type { CycleCountDetailDto, CycleCountSubmitResponseDto } from '../../../../../../core/feature/inventory/data/dto/InventoryDto';

describe('InventoryMapper cycle counts', () => {
	it('maps complete cycle-count header and detail line fields', () => {
		const dto: CycleCountDetailDto = {
			cycle_count: {
				count_id: 7, bin_id: 12, bin_code: 'A-01-02', bin_barcode: 'BIN-A0102',
				warehouse_id: 3, status: 'IN_PROGRESS', assigned_to: 'operator',
				created_at: '2026-11-14T12:00:00Z'
			},
			show_expected: false,
			lines: [{
				count_line_id: 40, item_id: 9, sku: 'SKU-9', item_name: 'Bearing',
				upc: '012345678901', expected_quantity: 8, counted_quantity: 6,
				variance: -2, scanned: true, unexpected: false
			}]
		};

		expect(InventoryMapper.toCycleCountDetail(dto)).toEqual({
			countId: 7, warehouseId: 3, binId: 12, binCode: 'A-01-02',
			binBarcode: 'BIN-A0102', status: 'IN_PROGRESS', assignedTo: 'operator',
			createdAt: '2026-11-14T12:00:00Z', showExpected: false,
			lines: [{
				countLineId: 40, itemId: 9, sku: 'SKU-9', itemName: 'Bearing',
				upc: '012345678901', expectedQuantity: 8, countedQuantity: 6,
				variance: -2, scanned: true, unexpected: false
			}]
		});
	});

	it('maps submit summary and unexpected adjustment marker', () => {
		const dto: CycleCountSubmitResponseDto = {
			message: 'Cycle count submitted', count_id: 7, bin_code: 'A-01-02', status: 'VARIANCE',
			summary: {
				total_lines: 2, lines_matched: 1, lines_with_variance: 1,
				adjustments: [{
					sku: 'SKU-NEW', expected: 0, counted: 2, variance: 2,
					adjustment_id: 81, unexpected: true
				}]
			}
		};
		expect(InventoryMapper.toSubmitResult(dto)).toEqual({
			countId: 7, binCode: 'A-01-02', status: 'VARIANCE',
			totalLines: 2, linesMatched: 1, linesWithVariance: 1,
			adjustments: [{
				sku: 'SKU-NEW', expected: 0, counted: 2, variance: 2,
				adjustmentId: 81, unexpected: true
			}]
		});
	});

	it('rejects unknown backend statuses instead of silently coercing them', () => {
		expect(() => InventoryMapper.toCycleCountDetail({
			cycle_count: {
				count_id: 1, bin_id: 1, bin_code: 'A-01', bin_barcode: null,
				warehouse_id: 1, status: 'CANCELLED', assigned_to: null, created_at: null
			},
			show_expected: true, lines: []
		})).toThrow(/Unsupported cycle count status/);
	});
});
