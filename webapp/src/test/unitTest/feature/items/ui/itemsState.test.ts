import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../../../core/infrastructure/errors/ApiError';
import type { Item, ItemDetail, ItemListPage } from '../../../../../core/feature/items/domain/entity/Item';
import type { ItemsDependencies } from '../../../../../core/feature/items/di/items.dependencies';
import { createItemsState } from '../../../../../core/feature/items/ui/state/itemsState.svelte';

const item: Item = {
	id: 7,
	sku: 'SKU-7',
	name: 'Caja',
	description: null,
	upc: null,
	mpn: null,
	barcodeAliases: [],
	category: 'Embalaje',
	weightLbs: null,
	lengthIn: null,
	widthIn: null,
	heightIn: null,
	defaultBinId: null,
	defaultBinCode: null,
	reorderPoint: null,
	reorderQty: null,
	isLotTracked: false,
	isSerialTracked: false,
	active: true,
	createdAt: null,
	updatedAt: null
};

const detail: ItemDetail = { item, inventory: [], preferredBins: [] };
const firstPage: ItemListPage = { items: [item], total: 101, page: 1, perPage: 50, pages: 3 };

function createDependencies() {
	return {
		listItems: { execute: vi.fn().mockResolvedValue(firstPage) },
		getItemDetail: { execute: vi.fn().mockResolvedValue(detail) },
		createItem: { execute: vi.fn().mockResolvedValue(item) },
		updateItem: { execute: vi.fn().mockResolvedValue(item) },
		archiveItem: { execute: vi.fn().mockResolvedValue({ message: 'updated', active: false }) },
		deleteItem: { execute: vi.fn().mockResolvedValue(undefined) },
		searchItems: { execute: vi.fn().mockResolvedValue([item]) }
	} as unknown as ItemsDependencies;
}

describe('Items UI state', () => {
	let dependencies: ItemsDependencies;

	beforeEach(() => {
		dependencies = createDependencies();
	});

	it('loads the requested page and publishes pagination state', async () => {
		const state = createItemsState(dependencies);
		vi.mocked(dependencies.listItems.execute).mockResolvedValueOnce({ ...firstPage, page: 2 });
		state.setQuery(' SKU-7 ');
		await state.load(2);

		expect(dependencies.listItems.execute).toHaveBeenCalledWith(
			{ q: 'SKU-7', filter: 'active', page: 2, perPage: 50 },
			expect.objectContaining({ signal: expect.any(AbortSignal) })
		);
		expect(state.items).toEqual([item]);
		expect(state.total).toBe(101);
		expect(state.page).toBe(2);
		expect(state.pages).toBe(3);
		expect(state.loading).toBe(false);
	});

	it.each([
		['active', true],
		['archived', false],
		['all', undefined]
	] as const)('passes the %s filter into the list query', async (filter) => {
		const state = createItemsState(dependencies);
		state.setFilter(filter);
		await state.load();

		expect(dependencies.listItems.execute).toHaveBeenCalledWith(
			expect.objectContaining({ filter, page: 1 }),
			expect.anything()
		);
	});

	it('does not let a superseded list request overwrite the latest result', async () => {
		let resolveOld!: (value: ItemListPage) => void;
		let resolveLatest!: (value: ItemListPage) => void;
		const oldPage = new Promise<ItemListPage>((resolve) => (resolveOld = resolve));
		const latestPage = new Promise<ItemListPage>((resolve) => (resolveLatest = resolve));
		vi.mocked(dependencies.listItems.execute)
			.mockReturnValueOnce(oldPage)
			.mockReturnValueOnce(latestPage);

		const state = createItemsState(dependencies);
		const oldLoad = state.load(1);
		const latestLoad = state.load(2);
		resolveOld({ ...firstPage, items: [], total: 0 });
		await oldLoad;
		resolveLatest({ ...firstPage, page: 2, items: [item] });
		await latestLoad;

		expect(state.page).toBe(2);
		expect(state.items).toEqual([item]);
		expect(state.loading).toBe(false);
	});

	it('cancels the active list request and ignores its result', async () => {
		let resolveRequest!: (value: ItemListPage) => void;
		const pending = new Promise<ItemListPage>((resolve) => (resolveRequest = resolve));
		vi.mocked(dependencies.listItems.execute).mockReturnValueOnce(pending);
		const state = createItemsState(dependencies);
		const request = state.load();
		const signal = vi.mocked(dependencies.listItems.execute).mock.calls[0][1]?.signal;

		state.cancelLoad();
		resolveRequest(firstPage);
		await request;

		expect(signal?.aborted).toBe(true);
		expect(state.items).toEqual([]);
		expect(state.loading).toBe(false);
	});

	it('loads and exposes item detail', async () => {
		const state = createItemsState(dependencies);
		await state.openDetail(item.id);

		expect(dependencies.getItemDetail.execute).toHaveBeenCalledWith(item.id);
		expect(state.detail).toEqual(detail);
	});

	it('archives/restores through the use case and reloads the current page', async () => {
		const state = createItemsState(dependencies);
		state.setPage(2);
		await state.toggleArchive(item);

		expect(dependencies.archiveItem.execute).toHaveBeenCalledWith(item.id);
		expect(dependencies.listItems.execute).toHaveBeenCalledWith(
			expect.objectContaining({ page: 2 }),
			expect.anything()
		);
	});

	it('deletes only after confirmation and clears the selected detail', async () => {
		const state = createItemsState(dependencies);
		await state.openDetail(item.id);
		state.setDeleteId(item.id);

		await expect(state.confirmDelete()).resolves.toBe(true);

		expect(dependencies.deleteItem.execute).toHaveBeenCalledWith(item.id);
		expect(state.deleteId).toBeNull();
		expect(state.detail).toBeNull();
		expect(dependencies.listItems.execute).toHaveBeenCalled();
	});

	it.each([
		[403, 'forbidden', 'No tienes permiso para esta operación'],
		[409, 'conflict', 'El registro cambió en otra operación'],
		[422, 'unprocessable', 'El producto no cumple las reglas']
	] as const)('surfaces HTTP %i errors without losing the form', async (status, code, message) => {
		vi.mocked(dependencies.createItem.execute).mockRejectedValueOnce(
			new ApiError(status, message, code)
		);
		const state = createItemsState(dependencies);
		state.openCreate();
		state.setFormField('sku', 'SKU-7');
		state.setFormField('itemName', 'Caja');

		await expect(state.save()).resolves.toBe(false);

		expect(state.error).toBe(message);
		expect(state.showForm).toBe(true);
		expect(state.form.sku).toBe('SKU-7');
		expect(state.saving).toBe(false);
	});

	it('keeps the delete confirmation open when the server rejects deletion', async () => {
		vi.mocked(dependencies.deleteItem.execute).mockRejectedValueOnce(
			new ApiError(409, 'El producto tiene movimientos asociados', 'conflict')
		);
		const state = createItemsState(dependencies);
		state.setDeleteId(item.id);

		await expect(state.confirmDelete()).resolves.toBe(false);

		expect(state.deleteId).toBe(item.id);
		expect(state.error).toBe('El producto tiene movimientos asociados');
		expect(state.saving).toBe(false);
	});

	it('reports detail permission failures and clears stale detail', async () => {
		vi.mocked(dependencies.getItemDetail.execute).mockRejectedValueOnce(
			new ApiError(403, 'Acceso denegado', 'forbidden')
		);
		const state = createItemsState(dependencies);
		await state.openDetail(item.id);

		expect(state.detail).toBeNull();
		expect(state.error).toBe('Acceso denegado');
	});
});
