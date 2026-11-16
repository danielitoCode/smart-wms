import { describe, expect, it, vi } from 'vitest';
import type { InboundActivityRepository } from '../../../../../core/feature/inbound-activity/domain/repository/InboundActivityRepository';
import { ListInboundActivityUseCase, GetInboundActivityDetailUseCase, FilterInboundActivityUseCase } from '../../../../../core/feature/inbound-activity/domain/usecase/InboundActivityUseCases';
function repository(): InboundActivityRepository {
	return { list: vi.fn().mockResolvedValue({ rows: [], page: 1, perPage: 50, total: 0, hasNext: false }), getDetail: vi.fn() } as unknown as InboundActivityRepository;
}
describe('Inbound activity use cases', () => {
	it('validates pagination, filters and date ranges', async () => {
		const repo = repository(), useCase = new ListInboundActivityUseCase(repo);
		await useCase.execute({ page: 2, perPage: 25, resource: 'items', status: 'applied' });
		expect(repo.list).toHaveBeenCalledWith(expect.objectContaining({ page: 2, perPage: 25 }));
		expect(() => useCase.execute({ page: 0 })).toThrow();
		expect(() => useCase.execute({ perPage: 501 })).toThrow();
		expect(() => useCase.execute({ resource: 'invalid' as never })).toThrow();
		expect(() => useCase.execute({ since: '2026-06-02', until: '2026-06-01' })).toThrow();
	});
	it('filters from the first page while retaining selected criteria', async () => {
		const repo = repository(), useCase = new FilterInboundActivityUseCase(repo);
		await useCase.execute({ page: 7, perPage: 10, status: 'superseded' });
		expect(repo.list).toHaveBeenCalledWith(expect.objectContaining({ page: 1, perPage: 10, status: 'superseded' }));
	});
	it('validates resource and identifier before detail request', async () => {
		const repo = repository(), useCase = new GetInboundActivityDetailUseCase(repo);
		await useCase.execute('items', 12);
		expect(repo.getDetail).toHaveBeenCalledWith('items', 12);
		expect(() => useCase.execute('other', 12)).toThrow();
		expect(() => useCase.execute('items', 0)).toThrow();
	});
});
