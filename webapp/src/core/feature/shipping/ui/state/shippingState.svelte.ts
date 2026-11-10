import { createShippingDependencies } from '../../di/shipping.dependencies';
import type { FulfillShipmentResult, ShippingOrderDetail } from '../../domain/entity/Shipping';

const deps = createShippingDependencies();

export function createShippingState() {
	let barcode = $state('');
	let detail = $state<ShippingOrderDetail | null>(null);
	let trackingNumber = $state('');
	let carrier = $state('');
	let shipMethod = $state('');
	let loading = $state(false);
	let busy = $state(false);
	let error = $state<string | null>(null);
	let lastResult = $state<FulfillShipmentResult | null>(null);

	async function load() {
		loading = true;
		error = null;
		lastResult = null;
		detail = null;
		try {
			detail = await deps.loadOrder.execute(barcode);
		} catch (err) {
			error = err instanceof Error ? err.message : 'No se pudo cargar el pedido';
		} finally {
			loading = false;
		}
	}

	async function fulfill() {
		if (!detail) return false;
		busy = true;
		error = null;
		lastResult = null;
		try {
			lastResult = await deps.fulfill.execute({
				soId: detail.salesOrder.soId,
				trackingNumber,
				carrier,
				shipMethod: shipMethod || null
			});
			detail = await deps.loadOrder.execute(detail.salesOrder.soNumber).catch(() => detail);
			return true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'No se pudo registrar el envío';
			return false;
		} finally {
			busy = false;
		}
	}

	return {
		get barcode() { return barcode; },
		get detail() { return detail; },
		get trackingNumber() { return trackingNumber; },
		get carrier() { return carrier; },
		get shipMethod() { return shipMethod; },
		get loading() { return loading; },
		get busy() { return busy; },
		get error() { return error; },
		get lastResult() { return lastResult; },
		setBarcode: (v: string) => { barcode = v; },
		setTrackingNumber: (v: string) => { trackingNumber = v; },
		setCarrier: (v: string) => { carrier = v; },
		setShipMethod: (v: string) => { shipMethod = v; },
		load,
		fulfill
	};
}
