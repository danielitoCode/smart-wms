import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';
import { InboundActivityRemoteDataSource } from '../../../../../core/feature/inbound-activity/data/datasource/InboundActivityRemoteDataSource';
describe('InboundActivityRemoteDataSource', () => {
	it('serializes supported filters and pagination', async () => {
		const api = { get: vi.fn().mockResolvedValue({}) } as unknown as ApiClient;
		await new InboundActivityRemoteDataSource(api).list({ page: 2, perPage: 25, resource: 'items',
			sourceSystem: 'erp', status: 'applied', since: '2026-01-01T00:00:00Z', until: '2026-01-31T23:59:59Z' });
		const url = new URL(String(vi.mocked(api.get).mock.calls[0][0]), 'http://localhost');
		expect(url.pathname).toBe('/api/admin/inbound/activity');
		expect(url.searchParams.get('page')).toBe('2');
		expect(url.searchParams.get('per_page')).toBe('25');
		expect(url.searchParams.get('resource')).toBe('items');
		expect(url.searchParams.get('source_system')).toBe('erp');
		expect(url.searchParams.get('status')).toBe('applied');
		expect(url.searchParams.get('since')).toBe('2026-01-01T00:00:00Z');
	});
	it('calls the existing detail endpoint', async () => {
		const api = { get: vi.fn().mockResolvedValue({}) } as unknown as ApiClient;
		await new InboundActivityRemoteDataSource(api).getDetail('sales_orders', 19);
		expect(api.get).toHaveBeenCalledWith('/api/admin/inbound/activity/sales_orders/19');
	});
});
