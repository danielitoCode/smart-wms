import { describe, it, expect, vi } from 'vitest';
import { createImportsState } from '#core/feature/imports/ui/state/importsState.svelte';

describe('Imports state', () => {
	it('preserves partial results and blocks replay until a new file is prepared', async () => {
		const execute = vi.fn()
			.mockResolvedValueOnce({ importType: 'items', total: 2, imported: 1, skipped: 1, errors: [{ row: 2, message: 'Duplicate SKU' }], message: 'Import complete' })
			.mockResolvedValueOnce({ importType: 'items', total: 1, imported: 1, skipped: 0, errors: [], message: 'Import complete' });
		const vm = createImportsState({ executeImport: { execute } } as never);
		const file = new File(['sku,name\nA,Alpha\nB,Beta'], 'items.csv', { type: 'text/csv' });
		expect(await vm.prepareFile(file)).toBe(true);
		expect(vm.records).toHaveLength(2);
		expect(await vm.executeImport()).toBe(true);
		expect(vm.result?.errors).toEqual([{ row: 2, message: 'Duplicate SKU' }]);
		expect(vm.job?.status).toBe('partial');
		expect(vm.attempted).toBe(true);
		expect(await vm.executeImport()).toBe(false);
		expect(execute).toHaveBeenCalledTimes(1);

		// After reconciling the partial result, the operator prepares a new file
		// containing only the rows that still need to be imported.
		vm.clearFile();
		const reconciledFile = new File(['sku,name\nB,Beta'], 'remaining-items.csv', { type: 'text/csv' });
		expect(await vm.prepareFile(reconciledFile)).toBe(true);
		expect(await vm.executeImport()).toBe(true);
		expect(execute).toHaveBeenNthCalledWith(2, 'items', [{ sku: 'B', name: 'Beta' }]);
		expect(vm.job?.status).toBe('completed');
	});
	it('rejects empty files and unsupported extensions before calling the API', async () => {
		const execute = vi.fn();
		const vm = createImportsState({ executeImport: { execute } } as never);
		expect(await vm.prepareFile(new File([], 'empty.csv'))).toBe(false);
		expect(vm.error).toContain('vacío');
		expect(await vm.prepareFile(new File(['data'], 'data.xlsx'))).toBe(false);
		expect(vm.error).toContain('Formato');
		expect(execute).not.toHaveBeenCalled();
	});
});
