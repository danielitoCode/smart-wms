import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import { ApiTokensRemoteDataSource } from '#core/feature/api-tokens/data/datasource/ApiTokensRemoteDataSource';
import { ApiTokensRepositoryImpl } from '#core/feature/api-tokens/data/repository/ApiTokensRepositoryImpl';

const listing = {
	token_id: 9, token_name: 'erp-prod', warehouse_ids: [1, 2],
	event_types: ['receipt.completed'], endpoints: ['events.poll'],
	connector_id: 'erp', status: 'active', source_system: null,
	inbound_resources: [], mapping_override: false,
	mapping_overrides_keys: [], rotation_status: 'recommended',
	created_at: '2026-11-01T10:00:00Z', rotated_at: '2026-11-01T10:00:00Z',
	expires_at: '2027-11-01T10:00:00Z', revoked_at: null, last_used_at: null
};

describe('API tokens Flask data contract', () => {
	it('uses the actual list and scope catalog paths and DTO names', async () => {
		const get = vi.fn()
			.mockResolvedValueOnce({ tokens: [listing] })
			.mockResolvedValueOnce({
				event_types: ['receipt.completed'], endpoints: ['events.poll'],
				inbound_resources: ['sales_orders'],
				source_systems: [{ source_system: 'erp', kind: 'connector' }]
			});
		const repo = new ApiTokensRepositoryImpl(new ApiTokensRemoteDataSource({ get } as unknown as ApiClient));
		const rows = await repo.list();
		const catalog = await repo.scopeCatalog();
		expect(get).toHaveBeenNthCalledWith(1, '/api/admin/tokens');
		expect(get).toHaveBeenNthCalledWith(2, '/api/admin/scope-catalog');
		expect(rows[0]).toMatchObject({
			name: 'erp-prod', warehouseIds: [1, 2], endpoints: ['events.poll'],
			eventTypes: ['receipt.completed'], status: 'active'
		});
		expect(catalog).toEqual({
			eventTypes: ['receipt.completed'], endpoints: ['events.poll'],
			inboundResources: ['sales_orders'],
			sourceSystems: [{ sourceSystem: 'erp', kind: 'connector' }]
		});
		expect(rows[0]).not.toHaveProperty('plaintext');
		expect(rows[0]).not.toHaveProperty('token');
	});

	it('sends exact Flask create fields and keeps the one-time secret outside the domain token', async () => {
		const post = vi.fn().mockResolvedValue({
			...listing, token: 'secret-issued-once'
		});
		const repo = new ApiTokensRepositoryImpl(new ApiTokensRemoteDataSource({ post } as unknown as ApiClient));
		const result = await repo.create({
			name: 'erp-prod', warehouseIds: [1], eventTypes: ['receipt.completed'],
			endpoints: ['events.poll'], expiresAt: '2027-01-01T00:00:00.000Z',
			sourceSystem: null, inboundResources: [], mappingOverride: false
		});
		expect(post).toHaveBeenCalledWith('/api/admin/tokens', {
			token_name: 'erp-prod', warehouse_ids: [1], event_types: ['receipt.completed'],
			endpoints: ['events.poll'], expires_at: '2027-01-01T00:00:00.000Z',
			source_system: null, inbound_resources: [], mapping_override: false
		});
		expect(result.plaintext).toBe('secret-issued-once');
		expect(result.token).not.toHaveProperty('token');
		expect(result.token).not.toHaveProperty('plaintext');
	});

	it('uses exact rotate, revoke and DELETE contracts; never accepts a missing secret', async () => {
		const post = vi.fn().mockResolvedValueOnce({ ...listing, token: 'new-secret' }).mockResolvedValueOnce(undefined);
		const del = vi.fn().mockResolvedValue(undefined);
		const repo = new ApiTokensRepositoryImpl(new ApiTokensRemoteDataSource({ post, delete: del } as unknown as ApiClient));
		const rotated = await repo.rotate(9);
		expect(post).toHaveBeenNthCalledWith(1, '/api/admin/tokens/9/rotate', {});
		expect(rotated.plaintext).toBe('new-secret');
		await repo.revoke(9);
		expect(post).toHaveBeenNthCalledWith(2, '/api/admin/tokens/9/revoke', {});
		await repo.remove(9);
		expect(del).toHaveBeenCalledWith('/api/admin/tokens/9');
	});

	it('fails closed if create or rotate response omits the one-time secret', async () => {
		const post = vi.fn().mockResolvedValue(listing);
		const repo = new ApiTokensRepositoryImpl(new ApiTokensRemoteDataSource({ post } as unknown as ApiClient));
		await expect(repo.rotate(9)).rejects.toThrow('no devolvió el nuevo secreto');
	});
});
