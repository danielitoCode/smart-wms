import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import ItemsScreen from '../../../../../core/feature/items/ui/screens/ItemsScreen.svelte';

const vm = vi.hoisted(() => ({
	items: [{
		id: 7,
		sku: 'SKU-7',
		name: 'Caja reforzada',
		upc: '012345678905',
		mpn: 'BOX-7',
		defaultBinCode: 'A-01-02',
		category: 'Embalaje',
		weightLbs: 12.5,
		active: true
	}],
	query: 'SKU-7',
	filter: 'active',
	loading: false,
	error: null,
	page: 1,
	pages: 3,
	total: 101,
	showForm: false,
	editId: null,
	form: {},
	saving: false,
	deleteId: null,
	detail: {
		item: {
			id: 7,
			sku: 'SKU-7',
			name: 'Caja reforzada',
			upc: '012345678905',
			mpn: 'BOX-7',
			category: 'Embalaje',
			weightLbs: 12.5,
			defaultBinCode: 'A-01-02',
			active: true
		},
		preferredBins: [{ preferredBinId: 3, binId: 4, binCode: 'A-01-02', zoneName: 'Picking', priority: 1 }],
		inventory: [{ inventoryId: 9, binId: 4, binCode: 'A-01-02', zoneName: 'Picking', quantityOnHand: 20, quantityAllocated: 5 }]
	},
	setQuery: vi.fn(),
	setFilter: vi.fn(),
	setFormField: vi.fn(),
	setDeleteId: vi.fn(),
	openCreate: vi.fn(),
	openEdit: vi.fn(),
	openDetail: vi.fn(),
	toggleArchive: vi.fn(),
	load: vi.fn(),
	closeForm: vi.fn(),
	save: vi.fn(),
	closeDetail: vi.fn(),
	confirmDelete: vi.fn()
}));

vi.mock('../../../../../core/feature/items/ui/state/itemsState.svelte', () => ({
	createItemsState: () => vm
}));

describe('ItemsScreen UI', () => {
	it('renders the search, filters, pagination and create controls in Spanish', () => {
		const i18n = { t: (message: string) => message };
		const { body } = render(ItemsScreen, {
			context: new Map([['i18n', i18n]])
		});

		expect(body).toContain('Productos');
		expect(body).toContain('Buscar por SKU, nombre, UPC o MPN');
		expect(body).toContain('Activos');
		expect(body).toContain('Archivados');
		expect(body).toContain('Todos');
		expect(body).toContain('Nuevo producto');
		expect(body).toContain('1 / 3 · 101');
	});

	it('preserves React list columns and displays the product identifiers and logistics fields', () => {
		const i18n = { t: (message: string) => message };
		const { body } = render(ItemsScreen, {
			context: new Map([['i18n', i18n]])
		});

		for (const heading of ['SKU', 'Nombre', 'UPC', 'MPN', 'Bin por defecto', 'Categoría', 'Peso (lb)', 'Estado', 'Acciones']) {
			expect(body).toContain(heading);
		}
		for (const value of ['SKU-7', 'Caja reforzada', '012345678905', 'BOX-7', 'A-01-02', 'Embalaje', '12.5 lb', 'Activo']) {
			expect(body).toContain(value);
		}
	});

	it('preserves React detail attributes, preferred bins and inventory locations', () => {
		const i18n = { t: (message: string) => message };
		const { body } = render(ItemsScreen, {
			context: new Map([['i18n', i18n]])
		});

		for (const value of ['Detalles del producto', 'SKU', 'UPC', 'MPN', 'Categoría', 'Peso (lb)', 'Bin por defecto', 'Ubicaciones preferidas', 'Prioridad', 'Inventario', 'Cantidad', 'Asignado', 'Picking', '20', '5']) {
			expect(body).toContain(value);
		}
	});
});
