import { createPackingDependencies } from '../../di/packing.dependencies';
import type { PackingOrderDetail } from '../../domain/entity/Packing';

const deps = createPackingDependencies();

export function createPackingState() {
	let barcode = $state('');
	let detail = $state<PackingOrderDetail | null>(null);
	let scannedBarcode = $state('');
	let quantity = $state(1);
	let loading = $state(false);
	let busy = $state(false);
	let error = $state<string | null>(null);
	let info = $state<string | null>(null);

	async function load() {
		loading = true;
		error = null;
		info = null;
		detail = null;
		try {
			detail = await deps.loadOrder.execute(barcode);
		} catch (err) {
			error = err instanceof Error ? err.message : 'No se pudo cargar el pedido';
		} finally {
			loading = false;
		}
	}

	async function verify() {
		if (!detail) return false;
		busy = true;
		error = null;
		info = null;
		try {
			const result = await deps.verify.execute({
				soId: detail.salesOrder.soId,
				scannedBarcode,
				quantity
			});
			info = result.message;
			detail = await deps.loadOrder.execute(detail.salesOrder.soNumber);
			scannedBarcode = '';
			return true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'No se pudo verificar el ítem';
			return false;
		} finally {
			busy = false;
		}
	}

	async function complete() {
		if (!detail) return false;
		busy = true;
		error = null;
		info = null;
		try {
			const result = await deps.complete.execute(detail.salesOrder.soId);
			info = result.message;
			detail = await deps.loadOrder.execute(detail.salesOrder.soNumber);
			return true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'No se pudo completar el packing';
			return false;
		} finally {
			busy = false;
		}
	}

	return {
		get barcode() { return barcode; },
		get detail() { return detail; },
		get scannedBarcode() { return scannedBarcode; },
		get quantity() { return quantity; },
		get loading() { return loading; },
		get busy() { return busy; },
		get error() { return error; },
		get info() { return info; },
		setBarcode: (v: string) => { barcode = v; },
		setScannedBarcode: (v: string) => { scannedBarcode = v; },
		setQuantity: (v: number) => { quantity = v; },
		load,
		verify,
		complete
	};
}
