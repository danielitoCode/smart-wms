import { describe, it, expect, vi } from 'vitest';
import { FulfillShipmentUseCase } from '../../../../../../core/feature/shipping/domain/usecase/FulfillShipmentUseCase';
import type { ShippingRepository } from '../../../../../../core/feature/shipping/domain/repository/ShippingRepository';

describe('FulfillShipmentUseCase', () => {
	it('fulfills with trimmed fields', async () => {
		const repo: ShippingRepository = {
			loadOrder: vi.fn(),
			fulfill: vi.fn().mockResolvedValue({
				message: 'Shipment fulfilled',
				fulfillmentId: 1,
				soNumber: 'SO-001',
				trackingNumber: '1Z',
				carrier: 'UPS',
				linesShipped: 1,
				totalQuantity: 2
			})
		};
		const useCase = new FulfillShipmentUseCase(repo);
		await useCase.execute({
			soId: 1,
			trackingNumber: ' 1Z ',
			carrier: ' UPS ',
			shipMethod: 'GROUND'
		});
		expect(repo.fulfill).toHaveBeenCalledWith({
			soId: 1,
			trackingNumber: '1Z',
			carrier: 'UPS',
			shipMethod: 'GROUND'
		});
	});

	it('rejects empty tracking_number', async () => {
		const repo = { loadOrder: vi.fn(), fulfill: vi.fn() } as ShippingRepository;
		expect(() => (
			new FulfillShipmentUseCase(repo).execute({
				soId: 1,
				trackingNumber: ' ',
				carrier: 'UPS'
			})
		))).toThrow(/tracking/);
	});
});
