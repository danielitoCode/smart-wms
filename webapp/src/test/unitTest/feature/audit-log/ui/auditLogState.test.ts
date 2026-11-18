import { beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
	list: { execute: vi.fn() },
	filter: { execute: vi.fn() }
}));

vi.mock('#core/feature/audit-log/di/auditLog.dependencies', () => ({
	createAuditLogDependencies: () => deps
}));

import { createAuditLogState } from '#core/feature/audit-log/ui/state/auditLogState.svelte';

describe('Audit log UI state', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		deps.list.execute.mockImplementation(async (query) => ({
			rows: [], page: query.page, perPage: query.perPage,
			total: 0, pages: 1
		}));
	});

	it('passes supported actor/action/date/item filters and sort to the list use case', async () => {
		const state = createAuditLogState();
		state.setActionType('SHIP');
		state.setActor('alice');
		state.setItemId('12');
		state.setStartDate('2026-11-01');
		state.setEndDate('2026-11-17');
		await state.applyFilters();
		expect(deps.list.execute).toHaveBeenCalledWith(expect.objectContaining({
			actionType: 'SHIP', actor: 'alice', itemId: 12,
			startDate: '2026-11-01', endDate: '2026-11-17',
			page: 1, perPage: 50, sortBy: 'created_at', sortDirection: 'desc'
		}));
	});

	it('changes page size and sort while resetting to page one', async () => {
		const state = createAuditLogState();
		await state.changePerPage(100);
		expect(deps.list.execute).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, perPage: 100 }));
		await state.changeSort('action_type');
		expect(deps.list.execute).toHaveBeenLastCalledWith(expect.objectContaining({
			page: 1, perPage: 100, sortBy: 'action_type', sortDirection: 'asc'
		}));
	});

	it('rejects invalid item filters without making a request', async () => {
		const state = createAuditLogState();
		state.setItemId('not-an-id');
		await state.applyFilters();
		expect(state.error).toContain('entero positivo');
		expect(deps.list.execute).not.toHaveBeenCalled();
	});
});
