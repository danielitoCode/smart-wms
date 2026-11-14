import { createVendorDependencies } from '../../di/vendors.dependencies';
import type { CreateVendor, UpdateVendor, Vendor, VendorFilter, VendorPage } from '../../domain/entity/Vendor';
import type { VendorDependencies } from '../../di/vendors.dependencies';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const DEFAULT_PAGE_SIZE = 50;

export function createVendorsState(dependencies: VendorDependencies = createVendorDependencies()) {
	let pageData = $state<VendorPage>({ items: [], total: 0, page: 1, perPage: DEFAULT_PAGE_SIZE, pages: 1 });
	let loading = $state(false);
	let detailLoading = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let detailError = $state<string | null>(null);
	let search = $state('');
	let filter = $state<VendorFilter>('active');
	let page = $state(1);
	let editing = $state<Vendor | null>(null);
	let detail = $state<Vendor | null>(null);
	let listRequestId = 0;
	let detailRequestId = 0;

	async function load(): Promise<void> {
		const requestId = ++listRequestId;
		loading = true;
		error = null;
		try {
			const result = await dependencies.list.execute({ search, filter, page, perPage: DEFAULT_PAGE_SIZE });
			if (requestId === listRequestId) pageData = result;
		} catch (cause) {
			if (requestId === listRequestId) error = toUserMessage(cause, 'No se pudieron cargar los proveedores');
		} finally {
			if (requestId === listRequestId) loading = false;
		}
	}

	async function loadDetail(canonicalId: string): Promise<void> {
		const requestId = ++detailRequestId;
		detailLoading = true;
		detailError = null;
		detail = null;
		try {
			const result = await dependencies.get.execute(canonicalId);
			if (requestId === detailRequestId) detail = result;
		} catch (cause) {
			if (requestId === detailRequestId) detailError = toUserMessage(cause, 'No se pudo cargar el proveedor');
		} finally {
			if (requestId === detailRequestId) detailLoading = false;
		}
	}

	function closeDetail(): void {
		detailRequestId++;
		detailLoading = false;
		detail = null;
		detailError = null;
	}

	async function create(input: CreateVendor): Promise<boolean> {
		saving = true; error = null;
		try {
			await dependencies.create.execute(input);
			page = 1;
			await load();
			return true;
		} catch (cause) {
			error = toUserMessage(cause, 'No se pudo crear el proveedor');
			return false;
		} finally { saving = false; }
	}

	async function update(canonicalId: string, input: UpdateVendor): Promise<boolean> {
		saving = true; error = null;
		try {
			await dependencies.update.execute(canonicalId, input);
			editing = null;
			await load();
			if (detail?.canonicalId === canonicalId) await loadDetail(canonicalId);
			return true;
		} catch (cause) {
			error = toUserMessage(cause, 'No se pudo actualizar el proveedor');
			return false;
		} finally { saving = false; }
	}

	async function deactivate(canonicalId: string): Promise<boolean> {
		return update(canonicalId, { isActive: false });
	}

	async function remove(canonicalId: string): Promise<boolean> {
		saving = true; error = null;
		try {
			await dependencies.remove.execute(canonicalId);
			if (detail?.canonicalId === canonicalId) closeDetail();
			await load();
			return true;
		} catch (cause) {
			error = toUserMessage(cause, 'No se pudo eliminar el proveedor');
			return false;
		} finally { saving = false; }
	}

	return {
		get vendors() { return pageData.items; },
		get pagination() { return pageData; },
		get loading() { return loading; },
		get detailLoading() { return detailLoading; },
		get saving() { return saving; },
		get error() { return error; },
		get detailError() { return detailError; },
		get search() { return search; },
		get filter() { return filter; },
		get page() { return page; },
		get editing() { return editing; },
		get detail() { return detail; },
		setSearch(value: string) { search = value; page = 1; },
		setFilter(value: VendorFilter) { filter = value; page = 1; },
		setPage(value: number) { page = Math.max(1, Math.min(value, pageData.pages)); },
		setEditing(value: Vendor | null) { editing = value; },
		load, loadDetail, closeDetail, create, update, deactivate, remove
	};
}
