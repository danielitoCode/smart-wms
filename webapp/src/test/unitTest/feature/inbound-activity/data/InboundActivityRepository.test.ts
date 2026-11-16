import { describe, expect, it, vi } from 'vitest';
import { InboundActivityRepositoryImpl } from '../../../../../core/feature/inbound-activity/data/repository/InboundActivityRepositoryImpl';
import type { InboundActivityRemoteDataSource } from '../../../../../core/feature/inbound-activity/data/datasource/InboundActivityRemoteDataSource';
describe('InboundActivityRepositoryImpl', () => {
	it('maps page metadata and rows from the Flask response', async () => {
		const remote = { list: vi.fn().mockResolvedValue({ rows: [{ inbound_id: 1, resource: 'items',
			source_system: 'erp', external_id: 'SKU-1', external_version: '1', canonical_id: null,
			received_at: null, status: 'applied', superseded_at: null, ingested_via_token_id: null }],
			page: 1, per_page: 10, total: 21, has_next: true }) } as unknown as InboundActivityRemoteDataSource;
		const result = await new InboundActivityRepositoryImpl(remote).list({ page: 1, perPage: 10 });
		expect(result).toMatchObject({ page: 1, perPage: 10, total: 21, hasNext: true });
		expect(result.rows[0].externalId).toBe('SKU-1');
	});
});
