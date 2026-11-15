import { describe, expect, it, vi } from 'vitest';
import type { ReceivingRepository } from '../../../../../../core/feature/receiving/domain/repository/ReceivingRepository';
import { ListReceiptsUseCase } from '../../../../../../core/feature/receiving/domain/usecase/ListReceiptsUseCase';
import { ListReceivingBinsUseCase } from '../../../../../../core/feature/receiving/domain/usecase/ListReceivingBinsUseCase';
import { UnreceiveReceiptUseCase } from '../../../../../../core/feature/receiving/domain/usecase/UnreceiveReceiptUseCase';
import { CancelReceiptsUseCase } from '../../../../../../core/feature/receiving/domain/usecase/CancelReceiptsUseCase';

function repository(overrides: Partial<ReceivingRepository> = {}): ReceivingRepository {
	return {
		lookupByBarcode: vi.fn(),
		receive: vi.fn(),
		cancelReceipts: vi.fn().mockResolvedValue({ message: 'Cancelled 2 receipt(s)', reversed: 2 }),
		listReceipts: vi.fn().mockResolvedValue([]),
		listBins: vi.fn().mockResolvedValue([]),
		unreceiveReceipt: vi.fn().mockResolvedValue({
			message: 'Receipt reversed',
			receiptId: 8,
			poId: 2,
			poStatus: 'PARTIAL',
			quantityReversed: 3,
			binDecrements: [{ binId: 4, quantity: 3 }]
		}),
		...overrides
	};
}

describe('Receiving history use cases', () => {
	it('lists receipts for a valid PO', async () => {
		const repo = repository();
		await new ListReceiptsUseCase(repo).execute(2);
		expect(repo.listReceipts).toHaveBeenCalledWith(2);
	});

	it('rejects invalid PO identifiers when listing receipts', () => {
		expect(() => new ListReceiptsUseCase(repository()).execute(0)).toThrow(/poId/);
	});

	it('lists bins for the PO warehouse', async () => {
		const repo = repository();
		await new ListReceivingBinsUseCase(repo).execute(4);
		expect(repo.listBins).toHaveBeenCalledWith(4);
	});

	it('rejects invalid warehouse identifiers', () => {
		expect(() => new ListReceivingBinsUseCase(repository()).execute(-1)).toThrow(/warehouseId/);
	});

	it('cancels a receiving session by PO and receipt IDs', async () => {
		const repo = repository();
		const result = await new CancelReceiptsUseCase(repo).execute(2, [7, 8]);
		expect(repo.cancelReceipts).toHaveBeenCalledWith(2, [7, 8]);
		expect(result.reversed).toBe(2);
	});

	it('rejects an empty or invalid cancellation receipt list', () => {
		const useCase = new CancelReceiptsUseCase(repository());
		expect(() => useCase.execute(2, [])).toThrow(/receiptIds/);
		expect(() => useCase.execute(2, [1, 0])).toThrow(/receiptId/);
	});

	it('unreceives a receipt with a normalized reason', async () => {
		const repo = repository();
		const result = await new UnreceiveReceiptUseCase(repo).execute(8, '  double scan  ');
		expect(repo.unreceiveReceipt).toHaveBeenCalledWith(8, 'double scan');
		expect(result.quantityReversed).toBe(3);
		expect(result.binDecrements).toEqual([{ binId: 4, quantity: 3 }]);
	});

	it('rejects an invalid receipt ID and an overlong reason', () => {
		const useCase = new UnreceiveReceiptUseCase(repository());
		expect(() => useCase.execute(0)).toThrow(/receiptId/);
		expect(() => useCase.execute(8, 'x'.repeat(501))).toThrow(/500/);
	});
});
