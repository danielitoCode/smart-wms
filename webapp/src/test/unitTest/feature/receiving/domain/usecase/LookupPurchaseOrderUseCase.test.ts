import { describe, it, expect, vi } from 'vitest';
import { LookupPurchaseOrderUseCase } from '../../../../../../core/feature/receiving/domain/usecase/LookupPurchaseOrderUseCase';
import type { ReceivingRepository } from '../../../../../../core/feature/receiving/domain/repository/ReceivingRepository';

function createRepo(overrides: Partial<ReceivingRepository> = {}): ReceivingRepository {
	return {
		lookupByBarcode: vi.fn(),
		receive: vi.fn(),
		cancelReceipts: vi.fn(),
		...overrides
	};
}

describe('LookupPurchaseOrderUseCase', () => {
	it('looks up trimmed barcode', async () => {
		const detail = {
			purchaseOrder: {
				poId: 1,
				poNumber: 'PO-001',
				vendorName: 'Vendor',
				status: 'OPEN',
				warehouseId: 1
			},
			lines: []
		};
		const repo = createRepo({
			lookupByBarcode: vi.fn().mockResolvedValue(detail)
		});
		const useCase = new LookupPurchaseOrderUseCase(repo);
		const result = await useCase.execute('  PO-001  ');
		expect(repo.lookupByBarcode).toHaveBeenCalledWith('PO-001');
		expect(result.purchaseOrder.poNumber).toBe('PO-001');
	});

	it('rejects empty barcode', async () => {
		const useCase = new LookupPurchaseOrderUseCase(createRepo());
		await expect(useCase.execute('  ')).rejects.toThrow(/barcode/);
	});
});
