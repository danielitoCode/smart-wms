import { createVendorDependencies } from '../../di/vendors.dependencies';
import type { CreateVendor, UpdateVendor, Vendor, VendorFilter, VendorPage } from '../../domain/entity/Vendor';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createVendorDependencies();

export function createVendorsState() {
	let pageData = $state<VendorPage>({ items: [], total: 0, page: 1, perPage: 50, pages: 1 });
	let loading = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let search = $state('');
	let filter = $state<VendorFilter>('active');
	let page = $state(1);
	let editing = $state<Vendor | null>(null);

	async function load(): Promise<void> {
		loading = true;
		error = null;
		try {
			pageData = await deps.list.execute({ search, filter, page, perPage: 50 });
		} catch (cause) {
			error = toUserMessage(cause, 'No se pudieron cargar los proveedores');
		} finally {
			loading = false;
		}
	}
	async function create(input: CreateVendor): Promise<boolean> {
		saving = true; error = null;
		try {
			await deps.create.execute(input);
			page = 1;
			await load();
			return true;
		} catch (cause) {
			error = toUserMessage(cause, 'No se pudo crear el proveedor');
			return false;
		} finally { saving = false; }
	}
	async function update(id: string, input: UpdateVendor): Promise<boolean> {
		saving = true; error = null;
		try {
			await deps.update.execute(id, input);
			editing = null;
			await load();
			return true;
		} catch (cause) {
			error = toUserMessage(cause, 'No se pudo actualizar el proveedor');
			return false;
		} finally { saving = false; }
	}
	async function remove(id: string): Promise<boolean> {
		saving = true; error = null;
		try {
			await deps.remove.execute(id);
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
		get saving() { return saving; },
		get error() { return error; },
		get search() { return search; },
		get filter() { return filter; },
		get page() { return page; },
		get editing() { return editing; },
		setSearch(value: string) { search = value; page = 1; },
		setFilter(value: VendorFilter) { filter = value; page = 1; },
		setPage(value: number) { page = value; },
		setEditing(value: Vendor | null) { editing = value; },
		load, create, update, remove
	};
}
