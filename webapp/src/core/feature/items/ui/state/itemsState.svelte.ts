import { toUserMessage } from '../../../../infrastructure/errors/ApiError';
import { createItemsDependencies } from '../../di/items.dependencies';
import type { Item, ItemDetail, ItemListFilter, ItemWriteInput } from '../../domain/entity/Item';

const deps = createItemsDependencies();

export type ItemFormModel = {
	sku: string;
	itemName: string;
	description: string;
	upc: string;
	mpn: string;
	category: string;
	weightLbs: string;
	defaultBinId: string;
};

function emptyForm(): ItemFormModel {
	return {
		sku: '',
		itemName: '',
		description: '',
		upc: '',
		mpn: '',
		category: '',
		weightLbs: '',
		defaultBinId: ''
	};
}

function formToWrite(form: ItemFormModel): ItemWriteInput {
	const weight = form.weightLbs.trim() === '' ? null : Number(form.weightLbs);
	const bin = form.defaultBinId.trim() === '' ? null : Number(form.defaultBinId);
	return {
		sku: form.sku,
		itemName: form.itemName,
		description: form.description || null,
		upc: form.upc || null,
		mpn: form.mpn || null,
		category: form.category || null,
		weightLbs: weight != null && Number.isFinite(weight) ? weight : null,
		defaultBinId: bin != null && Number.isInteger(bin) ? bin : null
	};
}

export function createItemsState() {
	let items = $state<Item[]>([]);
	let total = $state(0);
	let page = $state(1);
	let pages = $state(1);
	let perPage = $state(50);
	let query = $state('');
	let filter = $state<ItemListFilter>('active');
	let loading = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let detail = $state<ItemDetail | null>(null);
	let form = $state<ItemFormModel>(emptyForm());
	let editId = $state<number | null>(null);
	let showForm = $state(false);
	let deleteId = $state<number | null>(null);
	let listRequestId = 0;
	let activeListController: AbortController | null = null;

	function cancelLoad() {
		listRequestId += 1;
		activeListController?.abort();
		activeListController = null;
		loading = false;
	}

	async function load(nextPage = page) {
		activeListController?.abort();
		const controller = new AbortController();
		activeListController = controller;
		const requestId = ++listRequestId;
		loading = true;
		error = null;
		try {
			const result = await deps.listItems.execute(
				{
					q: query.trim() || undefined,
					filter,
					page: nextPage,
					perPage
				},
				{ signal: controller.signal }
			);
			if (requestId !== listRequestId) return;
			items = result.items;
			total = result.total;
			page = result.page;
			pages = result.pages;
			perPage = result.perPage;
		} catch (err) {
			if (requestId === listRequestId && !controller.signal.aborted) {
				error = toUserMessage(err, 'No se pudo cargar el catálogo de productos');
			}
		} finally {
			if (requestId === listRequestId) {
				loading = false;
				activeListController = null;
			}
		}
	}

	async function openDetail(id: number) {
		error = null;
		try {
			detail = await deps.getItemDetail.execute(id);
		} catch (err) {
			error = toUserMessage(err, 'No se pudo cargar el detalle del producto');
			detail = null;
		}
	}

	function openCreate() {
		editId = null;
		form = emptyForm();
		showForm = true;
		error = null;
	}

	function openEdit(item: Item) {
		editId = item.id;
		form = {
			sku: item.sku,
			itemName: item.name,
			description: item.description ?? '',
			upc: item.upc ?? '',
			mpn: item.mpn ?? '',
			category: item.category ?? '',
			weightLbs: item.weightLbs != null ? String(item.weightLbs) : '',
			defaultBinId: item.defaultBinId != null ? String(item.defaultBinId) : ''
		};
		showForm = true;
		error = null;
	}

	async function save() {
		if (saving) return false;
		saving = true;
		error = null;
		try {
			const body = formToWrite(form);
			if (editId != null) {
				await deps.updateItem.execute(editId, body);
			} else {
				await deps.createItem.execute(body);
			}
			showForm = false;
			editId = null;
			await load(page);
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo guardar el producto');
			return false;
		} finally {
			saving = false;
		}
	}

	async function toggleArchive(item: Item) {
		error = null;
		try {
			await deps.archiveItem.execute(item.id);
			await load(page);
			if (detail?.item.id === item.id) await openDetail(item.id);
		} catch (err) {
			error = toUserMessage(err, 'No se pudo archivar/restaurar el producto');
		}
	}

	async function confirmDelete() {
		if (deleteId == null || saving) return false;
		saving = true;
		error = null;
		try {
			await deps.deleteItem.execute(deleteId);
			deleteId = null;
			detail = null;
			await load(page);
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo eliminar el producto');
			return false;
		} finally {
			saving = false;
		}
	}

	return {
		get items() {
			return items;
		},
		get total() {
			return total;
		},
		get page() {
			return page;
		},
		get pages() {
			return pages;
		},
		get perPage() {
			return perPage;
		},
		get query() {
			return query;
		},
		get filter() {
			return filter;
		},
		get loading() {
			return loading;
		},
		get saving() {
			return saving;
		},
		get error() {
			return error;
		},
		get detail() {
			return detail;
		},
		get form() {
			return form;
		},
		get editId() {
			return editId;
		},
		get showForm() {
			return showForm;
		},
		get deleteId() {
			return deleteId;
		},
		setQuery(v: string) {
			query = v;
		},
		setFilter(v: ItemListFilter) {
			filter = v;
			page = 1;
		},
		setFormField<K extends keyof ItemFormModel>(key: K, value: ItemFormModel[K]) {
			form = { ...form, [key]: value };
		},
		setPage(p: number) {
			page = p;
		},
		setDeleteId(id: number | null) {
			deleteId = id;
		},
		closeForm() {
			showForm = false;
			editId = null;
		},
		closeDetail() {
			detail = null;
		},
		load,
		cancelLoad,
		openDetail,
		openCreate,
		openEdit,
		save,
		toggleArchive,
		confirmDelete
	};
}
