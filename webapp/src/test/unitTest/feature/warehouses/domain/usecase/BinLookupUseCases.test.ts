import { describe, expect, it, vi } from 'vitest';
import type { BinLookupRepository } from '../../../../../../core/feature/warehouses/domain/repository/BinLookupRepository';
import { SearchBinsUseCase } from '../../../../../../core/feature/warehouses/domain/usecase/SearchBinsUseCase';
import { LookupBinByBarcodeUseCase } from '../../../../../../core/feature/warehouses/domain/usecase/LookupBinByBarcodeUseCase';

describe('Operational bin lookup use cases', () => {
	it('normalizes search text and returns operational matches from the dedicated port', async () => {
		const repository = { searchOperationalBins: vi.fn().mockResolvedValue([]) } as unknown as BinLookupRepository;
		await expect(new SearchBinsUseCase(repository).execute('  A-01  ')).resolves.toEqual([]);
		expect(repository.searchOperationalBins).toHaveBeenCalledWith('A-01');
	});

	it('does not call the operational endpoint for an empty search', async () => {
		const repository = { searchOperationalBins: vi.fn() } as unknown as WarehouseManagementRepository;
		await expect(new SearchBinsUseCase(repository).execute('   ')).resolves.toEqual([]);
		expect(repository.searchOperationalBins).not.toHaveBeenCalled();
	});

	it('rejects overlong search queries before reaching the API', async () => {
		const repository = { searchOperationalBins: vi.fn() } as unknown as WarehouseManagementRepository;
		await expect(new SearchBinsUseCase(repository).execute('x'.repeat(129))).rejects.toThrow(/128/);
		expect(repository.searchOperationalBins).not.toHaveBeenCalled();
	});

	it('normalizes barcodes and propagates the scoped lookup result', async () => {
		const result = { bin: { id: 3, warehouseId: 1, code: 'A-01-01', barcode: 'BC-01', binType: 'Pickable' as const, zoneName: 'Picking', aisle: 'A', rowNumber: 1, levelNumber: 1 }, items: [] };
		const repository = { lookupOperationalBin: vi.fn().mockResolvedValue(result) } as unknown as WarehouseManagementRepository;
		await expect(new LookupBinByBarcodeUseCase(repository).execute(' BC-01 ')).resolves.toEqual(result);
		expect(repository.lookupOperationalBin).toHaveBeenCalledWith('BC-01');
	});

	it('rejects an empty barcode', async () => {
		const repository = { lookupOperationalBin: vi.fn() } as unknown as WarehouseManagementRepository;
		await expect(new LookupBinByBarcodeUseCase(repository).execute(' ')).rejects.toThrow(/required/);
		expect(repository.lookupOperationalBin).not.toHaveBeenCalled();
	});
});
