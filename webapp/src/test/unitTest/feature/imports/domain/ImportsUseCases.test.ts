import { describe, it, expect, vi } from 'vitest';
import type { ImportsRepository } from '#core/feature/imports/domain/repository/ImportsRepository';
import { ExecuteImportUseCase } from '#core/feature/imports/domain/usecase/ImportsUseCases';

describe('ExecuteImportUseCase', () => {
	it('rejects an empty import without calling the repository', async () => {
		const repository = { importRows: vi.fn() } as unknown as ImportsRepository;
		await expect(new ExecuteImportUseCase(repository).execute('items', [])).rejects.toThrow(/no contiene/);
		expect(repository.importRows).not.toHaveBeenCalled();
	});
	it('submits the selected catalog and records to the repository', async () => {
		const result = { importType: 'items', total: 1, imported: 1, skipped: 0, errors: [], message: 'ok' } as const;
		const repository = { importRows: vi.fn().mockResolvedValue(result) } as unknown as ImportsRepository;
		await expect(new ExecuteImportUseCase(repository).execute('items', [{ sku: 'A' }])).resolves.toEqual(result);
		expect(repository.importRows).toHaveBeenCalledWith('items', [{ sku: 'A' }]);
	});
});
