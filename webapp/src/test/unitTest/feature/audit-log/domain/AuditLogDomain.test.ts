import { describe, expect, it, vi } from 'vitest';
import type { AuditLogRepository } from '#core/feature/audit-log/domain/repository/AuditLogRepository';
import { FilterAuditLogUseCase, ListAuditLogUseCase } from '#core/feature/audit-log/domain/usecase/AuditLogUseCases';

describe('Audit log domain', () => {
	const repository: AuditLogRepository = {
		list: vi.fn(async (query) => ({
			rows: [], page: query?.page ?? 1, perPage: query?.perPage ?? 50,
			total: 0, pages: 1
		}))
	};

	it('validates page size, item id and date range before querying', async () => {
		const useCase = new ListAuditLogUseCase(repository);
		await expect(useCase.execute({ page: 0 })).rejects.toThrow('página');
		await expect(useCase.execute({ perPage: 1001 })).rejects.toThrow('1000');
		await expect(useCase.execute({ itemId: -4 })).rejects.toThrow('itemId');
		await expect(useCase.execute({ startDate: '2026-11-18', endDate: '2026-11-17' })).rejects.toThrow('fecha');
		await useCase.execute({ page: 1, perPage: 1000 });
		expect(repository.list).toHaveBeenCalledWith(expect.objectContaining({ perPage: 1000 }));
	});

	it('filters through the list use case without inventing an individual detail endpoint', async () => {
		const filter = new FilterAuditLogUseCase(new ListAuditLogUseCase(repository));
		await filter.execute({ actionType: 'SHIP', actor: 'alice', page: 8 });
		expect(repository.list).toHaveBeenLastCalledWith(expect.objectContaining({
			actionType: 'SHIP', actor: 'alice', page: 1
		}));
	});
});
