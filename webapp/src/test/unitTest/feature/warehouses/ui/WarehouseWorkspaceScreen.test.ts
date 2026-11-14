import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import WarehouseWorkspaceScreen from '../../../../../core/feature/warehouses/ui/screens/WarehouseWorkspaceScreen.svelte';

function renderWorkspace(selection: Record<string, unknown>) {
	return render(WarehouseWorkspaceScreen, {
		props: { mode: 'zones' },
		context: new Map<string, any>([
			['i18n', { t: (value: string) => value }],
			['warehouseSelection', selection]
		])
	});
}

describe('WarehouseWorkspaceScreen zone context', () => {
	it('shows only authorized warehouse choices when selection is permitted', () => {
		const { body } = renderWorkspace({
			canSelect: true, warehouses: [
				{ id: 1, code: 'WH-01', name: 'Central' },
				{ id: 2, code: 'WH-02', name: 'Secondary' }
			], warehouseId: 1, loading: false, initialized: true, error: null,
			select: vi.fn()
		});
		expect(body).toContain('WH-01 — Central');
		expect(body).toContain('WH-02 — Secondary');
		expect(body).toContain('Almacén seleccionado');
	});

	it('locks the active warehouse for users without selection permission', () => {
		const { body } = renderWorkspace({
			canSelect: false, warehouses: [{ id: 1, code: 'WH-01', name: 'Central' }],
			warehouseId: 1, loading: false, initialized: true, error: null,
			select: vi.fn()
		});
		expect(body).toContain('Almacén seleccionado: #1');
		expect(body).not.toContain('<select');
	});
});
