import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import WarehousesScreen from '../../../../../core/feature/warehouses/ui/screens/WarehousesScreen.svelte';

const vm = vi.hoisted(() => ({
	warehouses: [
		{ id: 8, code: 'WH-08', name: 'Almacén central', address: 'Calle 1', active: true },
		{ id: 9, code: 'WH-09', name: 'Almacén secundario', address: null, active: false }
	],
	loading: false, mutating: false, error: null, loadedOnce: true,
	total: 52, page: 2, pages: 2, perPage: 50,
	load: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), clearError: vi.fn()
}));

vi.mock('../../../../../core/feature/warehouses/ui/state/warehousesState.svelte', () => ({
	createWarehousesState: () => vm
}));

describe('WarehousesScreen UI', () => {
	it('renders warehouse identity, address, status and page navigation', () => {
		const i18n = { t: (message: string) => message };
		const selection = { reload: vi.fn() };
		const { body } = render(WarehousesScreen, {
			context: new Map<string, any>([['i18n', i18n], ['warehouseSelection', selection]])
		});
		expect(body).toContain('Almacenes');
		expect(body).toContain('WH-08');
		expect(body).toContain('Almacén central');
		expect(body).toContain('Calle 1');
		expect(body).toContain('WH-09');
		expect(body).toContain('Inactivo');
		expect(body).toContain('52 almacenes · página 2 de 2');
		expect(body).toContain('Anterior');
		expect(body).toContain('Siguiente');
	});

	it('renders create and destructive action entry points', () => {
		const i18n = { t: (message: string) => message };
		const { body } = render(WarehousesScreen, {
			context: new Map<string, any>([['i18n', i18n], ['warehouseSelection', { reload: vi.fn() }]])
		});
		expect(body).toContain('Nuevo almacén');
		expect(body).toContain('Editar');
		expect(body).toContain('Eliminar');
	});
});
