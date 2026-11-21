import { createShippingDependencies } from '../../di/shipping.dependencies';
import type { FulfillShipmentResult, ShippingOrderDetail } from '../../domain/entity/Shipping';
import type { WarehouseSelectionState } from '../../../warehouses/ui/state/warehouseSelectionState.svelte';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';
import { isR6ShippingExecutionAvailable, R6OperationNotSupportedError } from '../../../picking/domain/contract/R6PickingLifecycleContract';

const deps = createShippingDependencies();

export function createShippingState(warehouseSelection: WarehouseSelectionState) {
	let barcode = $state('');
	let detail = $state<ShippingOrderDetail | null>(null);
	let detailWarehouseId: number | null = null;
	let detailGeneration = -1;
	let trackingNumber = $state('');
	let carrier = $state('');
	let shipMethod = $state('');
	let loading = $state(false);
	let busy = $state(false);
	let error = $state<string | null>(null);
	let lastResult = $state<FulfillShipmentResult | null>(null);
	let info = $state<string | null>(null);
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
		loading = true; error = null; info = null; lastResult = null; detail = null; detailWarehouseId = null; detailGeneration = -1;
		try {
			const result = await deps.loadOrder.execute(code, warehouseId);
			if (epoch !== requestEpoch || !isCurrentContext(warehouseId, generation)) return false;
			if (result.salesOrder.warehouseId !== warehouseId) throw new Error('El pedido no pertenece al almacén seleccionado');
			detail = result;
			detailWarehouseId = warehouseId;
			detailGeneration = generation;
			shipMethod = result.salesOrder.shipMethod ?? 'GROUND';
			return true;
		} catch (err) {
			if (epoch === requestEpoch && isCurrentContext(warehouseId, generation)) error = toUserMessage(err, 'No se pudo cargar el pedido');
			return false;
		} finally { if (epoch === requestEpoch) loading = false; }
	}

	async function fulfill() {
		if (!isR6ShippingExecutionAvailable()) { error = new R6OperationNotSupportedError('validateShipmentPackage').message; return false; }
		if (!detail || busy || loading) return false;
		if (!trackingNumber.trim()) { error = 'tracking_number es obligatorio'; return false; }
		if (!carrier.trim()) { error = 'carrier es obligatorio'; return false; }
		let warehouseId: number;
		try { warehouseId = activeWarehouseId(); assertDetailWarehouse(); }
		catch (err) { error = toUserMessage(err, 'El pedido no pertenece al almacén activo'); return false; }
		busy = true; error = null; info = null; lastResult = null;
		const generation = warehouseSelection.generation;
		const soId = detail.salesOrder.soId;
		try {
			const result = await deps.fulfill.execute({
				soId,
				warehouseId,
				trackingNumber: trackingNumber.trim(),
				carrier: carrier.trim(),
				shipMethod: shipMethod.trim() || null
			});
			if (!isCurrentContext(warehouseId, generation)) {
				info = `Despacho confirmado en el almacén #${warehouseId}. El contexto cambió; vuelve a escanear para continuar.`;
				detail = null; detailWarehouseId = null; detailGeneration = -1;
				return true;
			}
			lastResult = result;
			detail = null; detailWarehouseId = null; detailGeneration = -1;
			return true;
		} catch (err) {
			if (isCurrentContext(warehouseId, generation)) error = toUserMessage(err, 'No se pudo registrar el envío');
			return false;
		} finally { busy = false; }
	}

	function onWarehouseChanged() {
		requestEpoch++;
		loading = false;
		detail = null; detailWarehouseId = null; detailGeneration = -1; trackingNumber = ''; carrier = ''; shipMethod = ''; error = null; info = null; lastResult = null;
	}

	return {
		get barcode() { return barcode; }, get detail() { return detail; },
		get trackingNumber() { return trackingNumber; }, get carrier() { return carrier; },
		get shipMethod() { return shipMethod; }, get loading() { return loading; },
		get busy() { return busy; }, get error() { return error; },
		get lastResult() { return lastResult; }, get info() { return info; }, get warehouseId() { return warehouseSelection.warehouseId; },
		get shippingExecutionAvailable() { return isR6ShippingExecutionAvailable(); },
		setBarcode: (v: string) => barcode = v,
		setTrackingNumber: (v: string) => trackingNumber = v,
		setCarrier: (v: string) => carrier = v,
		setShipMethod: (v: string) => shipMethod = v,
		load, fulfill, onWarehouseChanged
	};
}
