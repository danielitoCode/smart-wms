import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import PreferredBinsScreen from '../../../../../core/feature/preferred-bins/ui/screens/PreferredBinsScreen.svelte';

const vm = vi.hoisted(() => ({
	rows: [{
		preferredBinId: 91, itemId: 7, binId: 42, warehouseId: 3, priority: 1,
		updatedAt: '2026-11-14T10:00:00Z', sku: 'SKU-7', itemName: 'Test item',
		binCode: 'PICK-42', zoneName: 'Picking'
	}],
	warehouseOptions: [{ id: 3, code: 'WH-3', name: 'Warehouse 3' }],
	binOptions: [], itemOptions: [], selectedItem: null, selectedWarehouseId: 3,
	filterWarehouseId: null, selectedBinId: null, itemQuery: '', binQuery: '', rowsQuery: '',
	priority: 1, loading: false, loadingCatalogs: false, loadingBins: false,
	searchingItems: false, saving: false, error: null,
	loadCatalogs: vi.fn(), searchRows: vi.fn(), setWarehouseFilter: vi.fn(),
	searchItemCatalog: vi.fn(), chooseItem: vi.fn(), chooseWarehouse: vi.fn(),
	loadBins: vi.fn(), setSelectedBinId: vi.fn(), setPriority: vi.fn(), add: vi.fn(),
	updatePriority: vi.fn(), remove: vi.fn()
}));

vi.mock('../../../../../core/feature/preferred-bins/ui/state/preferredBinsState.svelte', () => ({
	createPreferredBinsState: () => vm
}));

describe('PreferredBinsScreen UI', () => {
	it('renders global search, warehouse filter and CSV export', () => {
		const i18n = { t: (value: string) => value };
		const { body } = render(PreferredBinsScreen, { context: new Map([['i18n', i18n]]) });
		for (const text of ['Ubicaciones preferidas', 'Nueva asignación', 'Buscar asignaciones por SKU o nombre', 'Filtrar por almacén', 'Todos los almacenes autorizados', 'Exportar CSV']) {
			expect(body).toContain(text);
		}
	});

	it('renders the full relation projection and priority actions', () => {
		const i18n = { t: (value: string) => value };
		const { body } = render(PreferredBinsScreen, { context: new Map([['i18n', i18n]]) });
		for (const text of ['SKU', 'Producto', 'Almacén', 'Código', 'Zona', 'Prioridad', 'Última actualización', 'Acciones', 'SKU-7', 'Test item', 'WH-3', 'PICK-42', 'Picking']) {
			expect(body).toContain(text);
		}
	});
});
