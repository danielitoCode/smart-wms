import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import { AuditLogRemoteDataSource } from '#core/feature/audit-log/data/datasource/AuditLogRemoteDataSource';
import { AuditLogRepositoryImpl } from '#core/feature/audit-log/data/repository/AuditLogRepositoryImpl';

describe('Audit log Flask data contract', () => {
	it('uses only supported filters and includes stable pagination and sort parameters', async () => {
		const get = vi.fn().mockResolvedValue({ entries: [], page: 2, per_page: 25, total: 31, pages: 2 });
		const source = new AuditLogRemoteDataSource({ get } as unknown as ApiClient);
		const result = await source.list({
			actionType: 'TOKEN_ISSUE', actor: 'operator', itemId: 42,
			startDate: '2026-11-01', endDate: '2026-11-17',
			page: 2, perPage: 25, sortBy: 'created_at', sortDirection: 'asc'
		});
		const url = new URL(get.mock.calls[0][0], 'https://example.test');
		expect(url.pathname).toBe('/api/admin/audit-log');
		expect(Object.fromEntries(url.searchParams.entries())).toEqual({
			page: '2', per_page: '25', sort_by: 'created_at', sort_direction: 'asc',
			action_type: 'TOKEN_ISSUE', user_id: 'operator', item_id: '42',
			start_date: '2026-11-01', end_date: '2026-11-17T23:59:59.999999'
		});
		expect(result.pages).toBe(2);
	});

	it('maps heterogeneous entity references and optional actor/metadata safely', async () => {
		const get = vi.fn().mockResolvedValue({
			entries: [
				{ log_id: 1, action_type: 'SHIP', entity_type: 'SO', entity_id: 77, entity_name: 'SO-00077',
					username: 'alice', device_id: 'scanner-1', warehouse_id: 3, warehouse_code: 'WH-A',
					details: { item: 'SKU-1', nested: { count: 2 } }, created_at: '2026-11-17T12:00:00Z' },
				{ log_id: 2, action_type: 'COUNT', entity_type: 'ITEM', entity_id: null,
					username: null, device_id: null, warehouse_id: null, warehouse_code: null,
					details: null, created_at: null }
			],
			page: 1, per_page: 50, total: 2, pages: 1
		});
		const repository = new AuditLogRepositoryImpl(new AuditLogRemoteDataSource({ get } as unknown as ApiClient));
		const result = await repository.list();
		expect(result.rows[0]).toMatchObject({
			logId: 1, action: 'SHIP', resourceType: 'SO', resourceId: 77,
			resourceName: 'SO-00077', actor: 'alice', warehouseCode: 'WH-A',
			metadata: { item: 'SKU-1', nested: { count: 2 } }
		});
		expect(result.rows[1]).toMatchObject({
			logId: 2, actor: null, metadata: null, occurredAt: null, resourceId: null
		});
		expect(result).toMatchObject({ page: 1, perPage: 50, total: 2, pages: 1 });
	});

	it('redacts sensitive metadata keys recursively before UI exposure', async () => {
		const get = vi.fn().mockResolvedValue({
			entries: [{
				log_id: 3, action_type: 'TOKEN_ISSUE', entity_type: 'WMS_TOKEN',
				details: { token_name: 'integration', token_hash: 'hash', billing_address: 'private address', nested: { api_key: 'secret', email: 'private@example.test', safe: 'ok' } }
			}], page: 1, per_page: 50, total: 1, pages: 1
		});
		const repository = new AuditLogRepositoryImpl(new AuditLogRemoteDataSource({ get } as unknown as ApiClient));
		const [row] = (await repository.list()).rows;
		expect(row.metadata).toEqual({
			token_name: 'integration', token_hash: '[REDACTED]', billing_address: '[REDACTED]',
			nested: { api_key: '[REDACTED]', email: '[REDACTED]', safe: 'ok' }
		});
	});

  it('redacts sensitive keys recursively inside arrays while preserving safe siblings', async () => {
    const get = vi.fn().mockResolvedValue({
      entries: [{
        log_id: 4, action_type: 'CONNECTOR_UPDATE', entity_type: 'CONNECTOR',
        details: { attempts: [{ api_key: 'secret', result: 'ok' }, { nested: { recipient_email: 'private@example.test', count: 2 } }] }
      }], page: 1, per_page: 50, total: 1, pages: 1
    });
    const repository = new AuditLogRepositoryImpl(new AuditLogRemoteDataSource({ get } as unknown as ApiClient));
    const [row] = (await repository.list()).rows;
    expect(row.metadata).toEqual({
      attempts: [{ api_key: '[REDACTED]', result: 'ok' }, { nested: { recipient_email: '[REDACTED]', count: 2 } }]
    });
  });
});
