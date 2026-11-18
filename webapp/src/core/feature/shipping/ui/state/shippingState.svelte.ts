import { createShippingDependencies } from '../../di/shipping.dependencies';
import type { FulfillShipmentResult, ShippingOrderDetail } from '../../domain/entity/Shipping';
import type { WarehouseSelectionState } from '../../../warehouses/ui/state/warehouseSelectionState.svelte';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createShippingDependencies();

export function createShippingState(warehouseSelection: WarehouseSelectionState) {
	let barcode = $state('');
	let detail = $state<ShippingOrderDetail | null>(null);
	let trackingNumber = $state('');
	let carrier = $state('');
	let shipMethod = $state('');
	let loading = $state(false);
	let busy = $state(false);
	let error = $state<string | null>(null);
	let lastResult = $state<FulfillShipmentResult | null>(null);

	function activeWarehouseId() { return warehouseSelection.requireWarehouseId(); }
	function assertDetailWarehouse() {
		const selected = activeWarehouseId();
		if (!detail || detail.salesOrder.warehouseId !== selected) {
			throw new Error('El pedido no pertenece al almacén seleccionado. Vuelve a escanearlo.');
		}
	}

	async function load() {
		if (loading || busy) return false;
		const code = barcode.trim();
		if (!code) { error = 'Indica un SO number o barcode'; return false; }
		loading = true; error = null; lastResult = null; detail = null;
		try {
			const warehouseId = activeWarehouseId();
			const result = await deps.loadOrder.execute(code, warehouseId);
			if (result.salesOrder.warehouseId !== warehouseId) throw new Error('El pedido no pertenece al almacén seleccionado');
			detail = result;
			return true;
		} catch (err) { error = toUserMessage(err, 'No se pudo cargar el pedido'); return false; }
		finally { loading = false; }
	}

	async function fulfill() {
		if (!detail || busy || loading) return false;
		if (!trackingNumber.trim()) { error = 'tracking_number es obligatorio'; return false; }
		if (!carrier.trim()) { error = 'carrier es obligatorio'; return false; }
		busy = true; error = null; lastResult = null;
		try {
			assertDetailWarehouse();
			lastResult = await deps.fulfill.execute({
				soId: detail.salesOrder.soId,
				warehouseId: activeWarehouseId(),
				trackingNumber: trackingNumber.trim(),
				carrier: carrier.trim(),
				shipMethod: shipMethod.trim() || null
			});
			detail = null;
			return true;
		} catch (err) { error = toUserMessage(err, 'No se pudo registrar el envío'); return false; }
		finally { busy = false; }
	}

	function onWarehouseChanged() {
		detail = null; trackingNumber = ''; carrier = ''; shipMethod = ''; error = null; lastResult = null;
	}

	return {
		get barcode() { return barcode; }, get detail() { return detail; },
		get trackingNumber() { return trackingNumber; }, get carrier() { return carrier; },
		get shipMethod() { return shipMethod; }, get loading() { return loading; },
		get busy() { return busy; }, get error() { return error; },
		get lastResult() { return lastResult; }, get warehouseId() { return warehouseSelection.warehouseId; },
		setBarcode: (v: string) => barcode = v,
		setTrackingNumber: (v: string) => trackingNumber = v,
		setCarrier: (v: string) => carrier = v,
		setShipMethod: (v: string) => shipMethod = v,
		load, fulfill, onWarehouseChanged
	};
}
