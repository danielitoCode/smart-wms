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
	detailLoading: false,
	detailError: null as string | null,
	error: null as string | null,
	page: 1,
	pages: 3,
	total: 101,
	showForm: false,
	editId: null as number | null,
	form: {},
	saving: false,
	deleteId: null as number | null,
	detail: ({
		item: {
			id: 7,
			sku: 'SKU-7',
			name: 'Caja reforzada',
			upc: '012345678905',
			mpn: 'BOX-7',
			category: 'Embalaje',
			weightLbs: 12.5,
			description: 'Caja de cartón reforzado',
			barcodeAliases: ['ALT-7', 'ALT-8'],
			lengthIn: 10,
			widthIn: 8,
			heightIn: 6,
			reorderPoint: 4,
			reorderQty: 12,
			isLotTracked: true,
			isSerialTracked: false,
			createdAt: '2026-01-01T10:00:00Z',
			updatedAt: '2026-02-01T10:00:00Z',
			defaultBinCode: 'A-01-02',
			active: true
		},
		preferredBins: [{ preferredBinId: 3, binId: 4, binCode: 'A-01-02', zoneName: 'Picking', priority: 1 }],
		inventory: [{ inventoryId: 9, binId: 4, binCode: 'A-01-02', zoneName: 'Picking', quantityOnHand: 20, quantityAllocated: 5 }]
	} as any) as any,
	setQuery: vi.fn(),
	setFilter: vi.fn(),
	setFormField: vi.fn(),
	setDeleteId: vi.fn(),
	openCreate: vi.fn(),
	openEdit: vi.fn(),
	openDetail: vi.fn(),
	toggleArchive: vi.fn(),
	isArchiving: vi.fn(() => false),
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


	it('shows reorder controls only while editing an existing item', () => {
		const original = { showForm: vm.showForm, editId: vm.editId, form: vm.form };
		const i18n = { t: (message: string) => message };
		try {
			vm.showForm = true;
			vm.editId = 7;
			vm.form = { sku: 'SKU-7', itemName: 'Caja', reorderPoint: '4', reorderQty: '12' };
			const editView = render(ItemsScreen, { context: new Map([['i18n', i18n]]) });
			expect(editView.body).toContain('Punto de reposición');
			expect(editView.body).toContain('Cantidad de reposición');

			vm.editId = null;
			const createView = render(ItemsScreen, { context: new Map([['i18n', i18n]]) });
			expect(createView.body).not.toContain('Punto de reposición');
			expect(createView.body).not.toContain('Cantidad de reposición');
		} finally {
			vm.showForm = original.showForm;
			vm.editId = original.editId;
			vm.form = original.form;
		}
	});


	it('disables the archive action while its request is in progress', () => {
		const original = vm.isArchiving;
		const i18n = { t: (message: string) => message };
		try {
			vm.isArchiving = vi.fn(() => true);
			const { body } = render(ItemsScreen, { context: new Map([['i18n', i18n]]) });
			expect(body).toContain('Procesando…');
			expect(body).toMatch(/disabled[^>]*>Procesando…/);
		} finally {
			vm.isArchiving = original;
		}
	});

	it('renders the detail loading and failure states', () => {
		const original = { detail: vm.detail, detailLoading: vm.detailLoading, detailError: vm.detailError };
		const i18n = { t: (message: string) => message };
		try {
			vm.detail = null;
			vm.detailLoading = true;
			vm.detailError = null;
			expect(render(ItemsScreen, { context: new Map([['i18n', i18n]]) }).body).toContain('Cargando detalle');
			vm.detailLoading = false;
			vm.detailError = 'No se pudo cargar el detalle';
			expect(render(ItemsScreen, { context: new Map([['i18n', i18n]]) }).body).toContain('No se pudo cargar el detalle');
		} finally {
			vm.detail = original.detail;
			vm.detailLoading = original.detailLoading;
			vm.detailError = original.detailError;
		}
	});

	it('shows the real server deletion constraint inside the confirmation dialog', () => {
		const original = { deleteId: vm.deleteId, error: vm.error };
		const i18n = { t: (message: string) => message };
		try {
			vm.deleteId = 7;
			vm.error = 'No se puede eliminar: existe inventario positivo';
			const { body } = render(ItemsScreen, { context: new Map([['i18n', i18n]]) });
			expect(body).toContain('No se puede eliminar: existe inventario positivo');
			expect(body).toContain('No se puede eliminar si tiene inventario o historial de pedidos');
		} finally {
			vm.deleteId = original.deleteId;
			vm.error = original.error;
		}
	});

	it('preserves React detail attributes, preferred bins and inventory locations', () => {
		const i18n = { t: (message: string) => message };
		const { body } = render(ItemsScreen, {
			context: new Map([['i18n', i18n]])
		});

		for (const value of ['Detalles del producto', 'SKU', 'UPC', 'MPN', 'Descripción', 'Códigos de barras alternativos', 'ALT-7, ALT-8', 'Categoría', 'Peso (lb)', 'Largo (in)', 'Ancho (in)', 'Alto (in)', 'Punto de reposición', 'Cantidad de reposición', 'Control por lote', 'Control por número de serie', 'Creado', 'Última actualización', 'Ubicaciones preferidas', 'Prioridad', 'Inventario', 'no identifican su almacén', 'Cantidad', 'Asignado', 'Picking', '20', '5']) {
			expect(body).toContain(value);
		}
	});
});
