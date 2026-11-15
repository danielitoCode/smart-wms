import { describe, expect, it, vi } from 'vitest';
import type { InventoryAdjustment, CreateInventoryAdjustment } from '../../../../../../core/feature/inventory-adjustments/domain/entity/InventoryAdjustment';
import type { InventoryAdjustmentsRepository } from '../../../../../../core/feature/inventory-adjustments/domain/repository/InventoryAdjustmentsRepository';
import {
	ApproveAdjustmentUseCase,
	CreateDirectAdjustmentUseCase,
	GetAdjustmentDetailUseCase,
	ListAdjustmentsUseCase,
	PendingAdjustmentsUseCase,
	RejectAdjustmentUseCase,
	ReviewAdjustmentsUseCase
} from '../../../../../../core/feature/inventory-adjustments/domain/usecase/InventoryAdjustmentUseCases';

const adjustment: InventoryAdjustment = {
	adjustmentId: 7, itemId: 2, binId: 3, warehouseId: 1, type: 'REMOVE', quantityChange: -2,
	reasonCode: 'DAMAGE', reasonDetail: 'Damaged units', status: 'PENDING',
	adjustedBy: 'operator', adjustedAt: null, cycleCountId: null
};

function createRepository(overrides: Partial<InventoryAdjustmentsRepository> = {}): InventoryAdjustmentsRepository {
	return {
		list: vi.fn().mockResolvedValue([adjustment]),
		pending: vi.fn().mockResolvedValue([adjustment]),
		createDirect: vi.fn().mockResolvedValue(undefined),
		review: vi.fn().mockResolvedValue(undefined),
		...overrides
	};
}

describe('Inventory adjustment use cases', () => {
	it('loads an adjustment detail by ID through the existing list endpoint', async () => {
		const repository = createRepository();
		const detail = await new GetAdjustmentDetailUseCase(repository).execute(7, 1);
		expect(detail).toEqual(adjustment);
		expect(repository.list).toHaveBeenCalledWith({
			adjustmentId: 7, warehouseId: 1, page: 1, perPage: 1
		});
	});

	it('lists adjustments using the selected warehouse and status', async () => {
		const repository = createRepository();
		await new ListAdjustmentsUseCase(repository).execute({ warehouseId: 1, status: 'APPROVED' });
		expect(repository.list).toHaveBeenCalledWith({ warehouseId: 1, status: 'APPROVED' });
	});

	it('loads only pending adjustments through the pending contract', async () => {
		const repository = createRepository();
		await new PendingAdjustmentsUseCase(repository).execute({ warehouseId: 1 });
		expect(repository.pending).toHaveBeenCalledWith({ warehouseId: 1 });
	});

	it('validates direct adjustment inputs before persistence', async () => {
		const repository = createRepository();
		const useCase = new CreateDirectAdjustmentUseCase(repository);
		const valid: CreateInventoryAdjustment = {
			itemId: 2, binId: 3, warehouseId: 1, type: 'ADD', quantity: 4, reason: ' Found stock '
		};
		await useCase.execute(valid);
		expect(repository.createDirect).toHaveBeenCalledWith({ ...valid, reason: 'Found stock' });
		expect(() => useCase.execute({ ...valid, quantity: 0 })).toThrow(/Cantidad/);
		expect(() => useCase.execute({ ...valid, reason: '   ' })).toThrow(/motivo/);
	});

	it('rejects duplicate or invalid IDs in batch review', () => {
		const repository = createRepository();
		const review = new ReviewAdjustmentsUseCase(repository);
		expect(() => review.execute([
			{ adjustmentId: 7, action: 'approve' },
			{ adjustmentId: 7, action: 'reject' }
		])).toThrow(/mismo ajuste/);
		expect(() => review.execute([{ adjustmentId: 0, action: 'approve' }])).toThrow(/Ajuste/);
		expect(repository.review).not.toHaveBeenCalled();
		expect(() => review.execute([{ adjustmentId: 8, action: 'reject' }])).toThrow(/motivo de rechazo/);
	});

	it('routes approve and reject through the shared review contract', async () => {
		const repository = createRepository();
		const review = new ReviewAdjustmentsUseCase(repository);
		await new ApproveAdjustmentUseCase(review).execute(7);
		await new RejectAdjustmentUseCase(review).execute(8, 'Variance not verified');
		expect(repository.review).toHaveBeenNthCalledWith(1, [{ adjustmentId: 7, action: 'approve' }]);
		expect(repository.review).toHaveBeenNthCalledWith(2, [{
			adjustmentId: 8,
			action: 'reject',
			rejectionReason: 'Variance not verified'
		}]);
	});
});
