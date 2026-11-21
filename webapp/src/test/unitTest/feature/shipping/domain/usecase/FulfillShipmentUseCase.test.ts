import { describe, it, expect, vi } from 'vitest';
import { FulfillShipmentUseCase } from '../../../../../../core/feature/shipping/domain/usecase/FulfillShipmentUseCase';
import type { ShippingRepository } from '../../../../../../core/feature/shipping/domain/repository/ShippingRepository';

describe('FulfillShipmentUseCase', () => {
	it('rejects a valid fulfillment while physical-package validation is unsupported', async () => {
		const repo: ShippingRepository = { loadOrder: vi.fn(), fulfill: vi.fn() };
		const useCase = new FulfillShipmentUseCase(repo);
		await expect(useCase.execute({ soId: 1, warehouseId: 6, trackingNumber: '1Z', carrier: 'UPS', shipMethod: 'GROUND' })).rejects.toMatchObject({
			name: 'R6OperationNotSupportedError', code: 'R6_CAPABILITY_BLOCKED', operation: 'validateShipmentPackage'
		});
		expect(repo.fulfill).not.toHaveBeenCalled();
	});

	it('rejects invalid identifiers and required transport metadata before reaching the repository', () => {
		const repo = { loadOrder: vi.fn(), fulfill: vi.fn() } as ShippingRepository;
		const useCase = new FulfillShipmentUseCase(repo);
		expect(() => useCase.execute({ soId: 0, warehouseId: 6, trackingNumber: 'T', carrier: 'UPS' })).toThrow(/soId/);
		expect(() => useCase.execute({ soId: 1, warehouseId: 0, trackingNumber: 'T', carrier: 'UPS' })).toThrow(/warehouseId/);
		expect(() => useCase.execute({ soId: 1, warehouseId: 6, trackingNumber: ' ', carrier: 'UPS' })).toThrow(/tracking/);
		expect(() => useCase.execute({ soId: 1, warehouseId: 6, trackingNumber: 'T', carrier: ' ' })).toThrow(/carrier/);
		expect(repo.fulfill).not.toHaveBeenCalled();
	});
}
