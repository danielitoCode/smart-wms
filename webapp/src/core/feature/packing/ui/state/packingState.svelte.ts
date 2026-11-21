import { createPackingDependencies } from '../../di/packing.dependencies';
import type { PackingOrderDetail } from '../../domain/entity/Packing';
import type { WarehouseSelectionState } from '../../../warehouses/ui/state/warehouseSelectionState.svelte';
import { toUserMessage } from '#core/infrastructure/errors/ApiError.ts';

const deps = createPackingDependencies();

export function createPackingState(warehouseSelection: WarehouseSelectionState) {
	let barcode = $state('');
	let detail = $state<PackingOrderDetail | null>(null);
	let detailWarehouseId: number | null = null;
	let detailGeneration = -1;
	let scannedBarcode = $state('');
	let quantity = $state(1);
	let loading = $state(false);
	let busy = $state(false);
	let error = $state<string | null>(null);
	let info = $state<string | null>(null);
	let reconciliationRequired = $state(false);
	let requestEpoch = 0;

	function isCurrentContext(warehouseId: number, generation: number) {
		return warehouseSelection.warehouseId === warehouseId && warehouseSelection.generation === generation;
	}

	function activeWarehouseId() { return warehouseSelection.requireWarehouseId(); }
	function assertDetailWarehouse() {
		const selected = activeWarehouseId();
		if (!detail || detail.salesOrder.warehouseId !== selected || detailWarehouseId !== selected || detailGeneration !== warehouseSelection.generation) {
			throw new Error('El pedido no pertenece al almacén seleccionado. Vuelve a escanearlo.');
		}
	}

	async function load() {
		if (loading || busy) return false;
		const code = barcode.trim();
		if (!code) { error = 'Indica un SO number o barcode'; return false; }
		const epoch = ++requestEpoch;
		const generation = warehouseSelection.generation;
		let warehouseId: number;
		try { warehouseId = activeWarehouseId(); }
		catch (err) { error = toUserMessage(err, 'No hay almacén activo'); return false; }
		loading = true; error = null; info = null; detail = null; detailWarehouseId = null; detailGeneration = -1;
		try {
			const result = await deps.loadOrder.execute(code, warehouseId);
			if (epoch !== requestEpoch || !isCurrentContext(warehouseId, generation)) return false;
			if (result.salesOrder.warehouseId !== warehouseId) throw new Error('El pedido no pertenece al almacén seleccionado');
			detail = result;
			detailWarehouseId = warehouseId;
			detailGeneration = generation;
			reconciliationRequired = false;
			return true;
		} catch (err) {
			if (epoch === requestEpoch && isCurrentContext(warehouseId, generation)) error = toUserMessage(err, 'No se pudo cargar el pedido');
			return false;
		} finally { if (epoch === requestEpoch) loading = false; }
	}

	async function verify() {
		if (!detail || busy || loading) return false;
		if (!scannedBarcode.trim()) { error = 'Indica el barcode a verificar'; return false; }
		if (!Number.isInteger(quantity) || quantity <= 0) { error = 'La cantidad debe ser un entero mayor que 0'; return false; }
		let warehouseId: number;
		try { warehouseId = activeWarehouseId(); assertDetailWarehouse(); }
		catch (err) { error = toUserMessage(err, 'El pedido no pertenece al almacén activo'); return false; }
		busy = true; error = null; info = null;
		const generation = warehouseSelection.generation;
		const requestId = requestEpoch;
		const soNumber = detail.salesOrder.soNumber;
		const soId = detail.salesOrder.soId;
		try {
			const result = await deps.verify.execute({ soId, warehouseId, scannedBarcode: scannedBarcode.trim(), quantity });
			if (!isCurrentContext(warehouseId, generation) || requestId !== requestEpoch) {
				info = `Verificación confirmada en el almacén #${warehouseId}. El contexto cambió; vuelve a cargar el pedido para continuar.`;
				detail = null; detailWarehouseId = null; detailGeneration = -1;
				return true;
			}
			info = result.message;
			try {
				const refreshed = await deps.loadOrder.execute(soNumber, warehouseId);
				if (!isCurrentContext(warehouseId, generation) || requestId !== requestEpoch) { detail = null; detailWarehouseId = null; detailGeneration = -1; return true; }
				detail = refreshed;
				detailWarehouseId = warehouseId;
				detailGeneration = generation;
				reconciliationRequired = false;
				scannedBarcode = ''; quantity = 1;
			} catch {
				if (isCurrentContext(warehouseId, generation) && requestId === requestEpoch) {
					detail = null; detailWarehouseId = null; detailGeneration = -1;
					reconciliationRequired = true;
					error = 'La verificación fue confirmada, pero no se pudo actualizar el pedido. Vuelve a cargarlo antes de continuar.';
				}
			}
			return true;
		} catch (err) {
			if (!isCurrentContext(warehouseId, generation) || requestId !== requestEpoch) return false;
			error = toUserMessage(err, 'No se pudo verificar el ítem');
			// A timeout may happen after Flask committed. Re-read the server
			// quantity before allowing the operator to scan this item again.
			try {
				const reconciled = await deps.loadOrder.execute(soNumber, warehouseId);
				if (isCurrentContext(warehouseId, generation) && requestId === requestEpoch) {
					detail = reconciled;
					detailWarehouseId = warehouseId;
					detailGeneration = generation;
					reconciliationRequired = false;
				}
			} catch {
				if (isCurrentContext(warehouseId, generation) && requestId === requestEpoch) {
					detail = null; detailWarehouseId = null; detailGeneration = -1;
					reconciliationRequired = true;
				}
			}
			return false;
		}
		finally { busy = false; }
	}

	async function complete() {
		if (!detail || busy || loading) return false;
		if (detail.lines.length === 0 || detail.lines.some(line => !Number.isInteger(line.quantityPicked) || !Number.isInteger(line.quantityPacked) || line.quantityPicked < 0 || line.quantityPacked < 0 || line.quantityPacked !== line.quantityPicked)) {
			error = 'No se puede completar el empaque: quedan unidades recogidas sin verificar.';
			return false;
		}
		let warehouseId: number;
		try { warehouseId = activeWarehouseId(); assertDetailWarehouse(); }
		catch (err) { error = toUserMessage(err, 'El pedido no pertenece al almacén activo'); return false; }
		busy = true; error = null; info = null;
		const generation = warehouseSelection.generation;
		const soNumber = detail.salesOrder.soNumber;
		const soId = detail.salesOrder.soId;
		try {
			const result = await deps.complete.execute(soId, warehouseId);
			info = isCurrentContext(warehouseId, generation) ? result.message : `Empaque completado en el almacén #${warehouseId}. El contexto cambió.`;
			detail = null; detailWarehouseId = null; detailGeneration = -1;
			return true;
		} catch (err) {
			if (!isCurrentContext(warehouseId, generation)) return false;
			error = toUserMessage(err, 'No se pudo completar el packing');
			// If complete committed but its response was lost, the PICKED-only
			// lookup rejects the now-PACKED order. Lock the UI rather than retrying.
			try {
				const reconciled = await deps.loadOrder.execute(soNumber, warehouseId);
				if (isCurrentContext(warehouseId, generation)) {
					detail = reconciled; detailWarehouseId = warehouseId; detailGeneration = generation;
					reconciliationRequired = false;
				}
			} catch {
				if (isCurrentContext(warehouseId, generation)) {
					detail = null; detailWarehouseId = null; detailGeneration = -1;
					reconciliationRequired = true;
					error = 'No se pudo determinar si el empaque se completó. No repitas la confirmación; vuelve a consultar el pedido o verifica su estado.';
				}
			}
			return false;
		}
		finally { busy = false; }
	}

	function onWarehouseChanged() {
		requestEpoch++;
		loading = false;
		detail = null; detailWarehouseId = null; detailGeneration = -1; scannedBarcode = ''; quantity = 1; error = null; info = null; reconciliationRequired = false;
	}

	return {
		get barcode() { return barcode; }, get detail() { return detail; },
		get scannedBarcode() { return scannedBarcode; }, get quantity() { return quantity; },
		get loading() { return loading; }, get busy() { return busy; },
		get error() { return error; }, get info() { return info; },
		get warehouseId() { return warehouseSelection.warehouseId; },
		get allVerified() { return !!detail && detail.lines.length > 0 && detail.lines.every(line => Number.isInteger(line.quantityPicked) && Number.isInteger(line.quantityPacked) && line.quantityPicked >= 0 && line.quantityPacked === line.quantityPicked); },
		get reconciliationRequired() { return reconciliationRequired; },
		setBarcode: (v: string) => barcode = v,
		setScannedBarcode: (v: string) => scannedBarcode = v,
		setQuantity: (v: number) => quantity = Number.isFinite(v) ? Math.trunc(v) : 1,
		load, verify, complete, onWarehouseChanged
	};
}
