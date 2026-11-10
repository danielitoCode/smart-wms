import { describe, expect, it, vi } from 'vitest';
import { LoadShippingOrderUseCase } from '#core/feature/shipping/domain/usecase/LoadShippingOrderUseCase';
import type { ShippingRepository } from '#core/feature/shipping/domain/repository/ShippingRepository';

describe('LoadShippingOrderUseCase', () => {
	it('rejects empty barcode', () => {
		const repo = { loadOrder: vi.fn() } as unknown as ShippingRepository;
		const uc = new LoadShippingOrderUseCase(repo);
		expect(() => uc.execute('  ')).toThrow(/barcode/);
	});

	it('trims barcode before load', async () => {
		const repo = {
			loadOrder: vi.fn().mockResolvedValue({
				salesOrder: { soId: 1, soNumber: 'SO-1', status: 'PACKED' },
				lines: [],
				totalItems: 0,
				totalLines: 0
			})
		} as unknown as ShippingRepository;
		const uc = new LoadShippingOrderUseCase(repo);
		await uc.execute(' SO-1 ');
		expect(repo.loadOrder).toHaveBeenCalledWith('SO-1');
	});
});
