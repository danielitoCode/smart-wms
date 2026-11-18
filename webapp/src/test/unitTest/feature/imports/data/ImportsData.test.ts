import { describe, it, expect, vi } from 'vitest';
import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import { ImportsRemoteDataSource } from '#core/feature/imports/data/datasource/ImportsRemoteDataSource';
import { CsvImportMapper } from '#core/feature/imports/data/mapper/CsvImportMapper';

describe('Imports Flask contract', () => {
	it('posts records to the selected catalog endpoint (not rows)', async () => {
		const post = vi.fn().mockResolvedValue({ message: 'Import complete', total: 2, imported: 1, skipped: 1, errors: [{ row: 2, error: 'Duplicate SKU' }] });
		const remote = new ImportsRemoteDataSource({ post } as unknown as ApiClient);
		const response = await remote.importRows('items', [{ sku: 'A' }, { sku: 'A' }]);
		expect(post).toHaveBeenCalledWith('/api/admin/import/items', { records: [{ sku: 'A' }, { sku: 'A' }] });
		expect(CsvImportMapper.toDomain('items', response)).toEqual({
			importType: 'items', total: 2, imported: 1, skipped: 1,
			errors: [{ row: 2, message: 'Duplicate SKU' }], message: 'Import complete'
		});
	});
});
