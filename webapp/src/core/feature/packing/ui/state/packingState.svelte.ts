import { createPackingDependencies } from '../../di/packing.dependencies';
import type { PackingOrderDetail } from '../../domain/entity/Packing';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

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
		if (loading || busy) return false;
		const code = barcode.trim();
		if (!code) {
			error = 'Indica un SO number o barcode';
			return false;
		}
		loading = true;
		error = null;
		info = null;
		detail = null;
		try {
			detail = await deps.loadOrder.execute(code);
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo cargar el pedido');
			return false;
		} finally {
			loading = false;
		}
	}

	async function verify() {
		if (!detail || busy || loading) return false;
		if (!scannedBarcode.trim()) {
			error = 'Indica el barcode a verificar';
			return false;
		}
		if (!Number.isInteger(quantity) || quantity <= 0) {
			error = 'La cantidad debe ser un entero mayor que 0';
			return false;
		}
		busy = true;
		error = null;
		info = null;
		const soNumber = detail.salesOrder.soNumber;
		try {
			const result = await deps.verify.execute({
				soId: detail.salesOrder.soId,
				scannedBarcode: scannedBarcode.trim(),
				quantity
			});
			info = result.message;
			try {
				detail = await deps.loadOrder.execute(soNumber);
			} catch {
				// keep prior detail if refresh fails; still report verify success
			}
			scannedBarcode = '';
			quantity = 1;
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo verificar el ítem');
			return false;
		} finally {
			busy = false;
		}
	}

	async function complete() {
		if (!detail || busy || loading) return false;
		busy = true;
		error = null;
		info = null;
		const soNumber = detail.salesOrder.soNumber;
		try {
			const result = await deps.complete.execute(detail.salesOrder.soId);
			info = result.message;
			try {
				detail = await deps.loadOrder.execute(soNumber);
			} catch {
				/* ignore refresh failure after success */
			}
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo completar el packing');
			return false;
		} finally {
			busy = false;
		}
	}

	return {
		get barcode() {
			return barcode;
		},
		get detail() {
			return detail;
		},
		get scannedBarcode() {
			return scannedBarcode;
		},
		get quantity() {
			return quantity;
		},
		get loading() {
			return loading;
		},
		get busy() {
			return busy;
		},
		get error() {
			return error;
		},
		get info() {
			return info;
		},
		setBarcode: (v: string) => {
			barcode = v;
		},
		setScannedBarcode: (v: string) => {
			scannedBarcode = v;
		},
		setQuantity: (v: number) => {
			quantity = Number.isFinite(v) ? Math.trunc(v) : 1;
		},
		load,
		verify,
		complete
	};
}
