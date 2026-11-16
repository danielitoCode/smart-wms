import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';
import { InboundActivityRemoteDataSource } from '../../../../../core/feature/inbound-activity/data/datasource/InboundActivityRemoteDataSource';
import { InboundActivityRepositoryImpl } from '../../../../../core/feature/inbound-activity/data/repository/InboundActivityRepositoryImpl';
import type { InboundActivityDto, InboundActivityListResponseDto } from '../../../../../core/feature/inbound-activity/data/dto/InboundActivityDto';
import {
	FilterInboundActivityUseCase,
	GetInboundActivityDetailUseCase,
	ListInboundActivityUseCase
} from '../../../../../core/feature/inbound-activity/domain/usecase/InboundActivityUseCases';
import { createInboundActivityState } from '../../../../../core/feature/inbound-activity/ui/state/inboundActivityState.svelte';

const dto: InboundActivityDto = {
	inbound_id: 17,
	resource: 'purchase_orders',
	source_system: 'erp',
	external_id: 'EXT-PO-17',
	external_version: 'v3',
	canonical_id: '5d32f7bb-a2e9-4a1b-8e6a-62d1f2c1c9d1',
	received_at: '2026-11-15T10:00:00Z',
	status: 'applied',
	superseded_at: null,
	ingested_via_token_id: 4,
	source_payload: null,
	canonical_payload: { po_number: 'PO-2026-17' },
	source_payload_retained: false
};

function setup() {
	const response: InboundActivityListResponseDto = {
		rows: [dto], page: 1, per_page: 25, limit: 25, total: 1, has_next: false
	};
	const get = vi.fn(async (path: string): Promise<InboundActivityDto | InboundActivityListResponseDto> =>
		path.includes('/17') ? dto : response
	);
	const api = { get } as unknown as ApiClient;
	const remote = new InboundActivityRemoteDataSource(api);
	const repository = new InboundActivityRepositoryImpl(remote);
	const dependencies = {
		list: new ListInboundActivityUseCase(repository),
		filter: new FilterInboundActivityUseCase(repository),
		getDetail: new GetInboundActivityDetailUseCase(repository)
	};
	return { get, state: createInboundActivityState(dependencies) };
}

describe('Inbound activity UI state + application + repository integration', () => {
	it('loads list rows through the real datasource, repository and mapper', async () => {
		const { get, state } = setup();
		await state.load();

		expect(get).toHaveBeenCalledWith('/api/admin/inbound/activity?page=1&per_page=50');
		expect(state.rows).toMatchObject([{ inboundId: 17, resource: 'purchase_orders', canonicalId: dto.canonical_id }]);
		expect(state.total).toBe(1);
		expect(state.loading).toBe(false);
	});

	it('applies UI filters and resets pagination before requesting the repository', async () => {
		const { get, state } = setup();
		state.setPage(4);
		state.setResource('purchase_orders');
		state.setSourceSystem(' erp ');
		state.setStatus('applied');
		state.setSince('2026-11-01T00:00');
		await state.applyFilters();

		const requestedPath = String(get.mock.calls[0][0]);
		const url = new URL(requestedPath, 'http://localhost');
		expect(url.searchParams.get('page')).toBe('1');
		expect(url.searchParams.get('resource')).toBe('purchase_orders');
		expect(url.searchParams.get('source_system')).toBe('erp');
		expect(url.searchParams.get('status')).toBe('applied');
		expect(url.searchParams.get('since')).toBe(new Date('2026-11-01T00:00').toISOString());
	});

	it('loads canonical detail through the real repository and mapper', async () => {
		const { get, state } = setup();
		await state.openDetail({
			inboundId: 17, resource: 'purchase_orders', sourceSystem: 'erp', externalId: 'EXT-PO-17',
			externalVersion: 'v3', canonicalId: dto.canonical_id, receivedAt: dto.received_at,
			status: 'applied', supersededAt: null, ingestedViaTokenId: 4
		});

		expect(get).toHaveBeenCalledWith('/api/admin/inbound/activity/purchase_orders/17');
		expect(state.detail?.canonicalPayload).toEqual({ po_number: 'PO-2026-17' });
		expect(state.detail?.sourcePayload).toBeNull();
		expect(state.detail?.sourcePayloadRetained).toBe(false);
		expect(state.detailLoading).toBe(false);
	});

	it('preserves the previous list and exposes a retryable error after a failed refresh', async () => {
		const { get, state } = setup();
		await state.load();
		get.mockRejectedValueOnce(new Error('offline'));
		await state.load();

		expect(state.rows).toHaveLength(1);
		expect(state.error).toBeTruthy();
		expect(state.loading).toBe(false);
	});

	it('ignores an older list response when a newer filter request finishes first', async () => {
		const { get, state } = setup();
		let resolveOld!: (value: InboundActivityListResponseDto) => void;
		const pending = new Promise<InboundActivityListResponseDto>(resolve => { resolveOld = resolve; });
		get.mockReturnValueOnce(pending as Promise<InboundActivityDto | InboundActivityListResponseDto>)
			.mockResolvedValueOnce({ rows: [], page: 1, per_page: 50, limit: 50, total: 0, has_next: false });
		const oldRequest = state.load();
		const latestRequest = state.applyFilters();
		await latestRequest;
		resolveOld({ rows: [dto], page: 1, per_page: 50, limit: 50, total: 1, has_next: false });
		await oldRequest;

		expect(state.rows).toEqual([]);
		expect(state.loading).toBe(false);
	});
});
