import { describe, expect, it, vi } from 'vitest';
import type { PutawayRepository } from '../../../../../../core/feature/putaway/domain/repository/PutawayRepository';
import { StagingSummaryUseCase } from '../../../../../../core/feature/putaway/domain/usecase/StagingSummaryUseCase';
import { SuggestDestinationUseCase } from '../../../../../../core/feature/putaway/domain/usecase/SuggestDestinationUseCase';
import { UpdatePreferredBinUseCase } from '../../../../../../core/feature/putaway/domain/usecase/UpdatePreferredBinUseCase';

function repository(): PutawayRepository {
	return {
		listPending: vi.fn(), getStagingSummary: vi.fn().mockResolvedValue([]),
		suggest: vi.fn().mockResolvedValue({ itemId: 1, sku: 'A', itemName: 'Item', preferredBin: null, suggestedBin: null }),
		confirm: vi.fn(), updatePreferred: vi.fn().mockResolvedValue({ message: 'saved', itemId: 1, binId: 3, binCode: 'PICK-1' })
	};
}
describe('Putaway workflow use cases', () => {
	it('loads staging summary for a valid warehouse', async () => {
		const repo = repository();
		await new StagingSummaryUseCase(repo).execute(2);
		expect(repo.getStagingSummary).toHaveBeenCalledWith(2);
		expect(() => new StagingSummaryUseCase(repo).execute(0)).toThrow(/warehouseId/);
	});
	it('suggests destination for a valid item', async () => {
		const repo = repository();
		await new SuggestDestinationUseCase(repo).execute(1);
		expect(repo.suggest).toHaveBeenCalledWith(1);
		expect(() => new SuggestDestinationUseCase(repo).execute(-1)).toThrow(/itemId/);
	});
	it('updates preferred bin through putaway contract', async () => {
		const repo = repository();
		await new UpdatePreferredBinUseCase(repo).execute(1, 3);
		expect(repo.updatePreferred).toHaveBeenCalledWith(1, 3);
		expect(() => new UpdatePreferredBinUseCase(repo).execute(1, 0)).toThrow(/binId/);
	});
});
