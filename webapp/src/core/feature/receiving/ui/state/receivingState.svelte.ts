import { getContext } from 'svelte';
import { createReceivingDependencies } from '../../di/receiving.dependencies';
import { createWarehousesDependencies } from '../../../warehouses/di/warehouses.dependencies';
import type { Bin } from '../../../warehouses/domain/entity/Warehouse';
import type { ReceiptHistoryEntry, UnreceiveResult } from '../../domain/entity/ReceiptHistory';
import type {
	CancelReceiptsResult,
	PurchaseOrderDetail,
	ReceiveLineInput,
	ReceiveResult
} from '../../domain/entity/PurchaseOrder';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';
import { beginWarehouseScopedRequest } from '../../../../infrastructure/warehouse/WarehouseRequestScope';
import type { WarehouseSelectionState } from '../../../warehouses/ui/state/warehouseSelectionState.svelte';

const deps = createReceivingDependencies();
const warehouseDeps = createWarehousesDependencies();

export type LineDraft = {
	itemId: number;
	sku: string;
	itemName: string;
	remaining: number;
	quantity: number;
	binId: string;
	lotNumber: string;
	serialNumber: string;
	notes: string;
};

function isAbort(err: unknown): boolean {
	return (
		(err instanceof DOMException && err.name === 'AbortError') ||
		(err instanceof Error && /abort/i.test(err.message))
	);
}

function preferredBinId(): string {
	return String(bins.find(bin => bin.binType === 'Staging')?.id ?? bins[0]?.id ?? '');
}

function mapDrafts(detail: PurchaseOrderDetail, defaultBinId = preferredBinId()): LineDraft[] {
	return detail.lines
		.filter((line) => line.quantityRemaining > 0)
		.map((line) => ({
			itemId: line.itemId,
			sku: line.sku,
			itemName: line.itemName,
			remaining: line.quantityRemaining,
			quantity: line.quantityRemaining,
			binId: defaultBinId,
			lotNumber: '',
			serialNumber: '',
			notes: ''
		}));
}

/**
 * Receiving UI state (F0.3).
 * Each network op is generation-scoped so a warehouse switch drops late responses.
 */
export function createReceivingState() {
	const warehouseSelection = getContext<WarehouseSelectionState | undefined>('warehouseSelection');

	let barcode = $state('');
	let detail = $state<PurchaseOrderDetail | null>(null);
	let drafts = $state<LineDraft[]>([]);
	let loading = $state(false);
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let lastResult = $state<ReceiveResult | null>(null);
	let lastCancel = $state<CancelReceiptsResult | null>(null);
	let receiptIdsInput = $state('');
	let cancelling = $state(false);
	let receipts = $state<ReceiptHistoryEntry[]>([]);
	let receiptsLoading = $state(false);
	let receiptsError = $state<string | null>(null);
	let unreceivingId = $state<number | null>(null);
	let lastUnreceive = $state<UnreceiveResult | null>(null);
	let receiptHistoryRequest = 0;
	let bins = $state<Bin[]>([]);
	let binsLoading = $state(false);
	let binsError = $state<string | null>(null);
	let binsRequest = 0;

	async function loadBins(warehouseId: number): Promise<boolean> {
		const requestId = ++binsRequest;
		const scope = warehouseSelection?.beginScopedRequest() ?? beginWarehouseScopedRequest();
		binsLoading = true;
		binsError = null;
		bins = [];
		try {
			const page = await warehouseDeps.listBins.execute({ warehouseId, page: 1, perPage: 1000 });
			if (!scope.isCurrent() || requestId !== binsRequest) return false;
			const scoped = page.items.filter(bin => bin.active && bin.warehouseId === warehouseId);
			bins = scoped.sort((a, b) => {
				const aStaging = a.binType === 'Staging' ? 0 : 1;
				const bStaging = b.binType === 'Staging' ? 0 : 1;
				return aStaging - bStaging || a.code.localeCompare(b.code);
			});
			if (scoped.length === 0) binsError = 'No hay bins activos en el almacén de esta orden.';
			return true;
		} catch (cause) {
			if (!scope.isCurrent() || requestId !== binsRequest || isAbort(cause)) return false;
			binsError = toUserMessage(cause, 'No se pudieron cargar los bins del almacén');
			return false;
		} finally {
			scope.release();
			if (requestId === binsRequest) binsLoading = false;
		}
	}

	async function loadReceiptHistory(poId: number) {
		const scope = warehouseSelection?.beginScopedRequest() ?? beginWarehouseScopedRequest();
		const requestId = ++receiptHistoryRequest;
		receiptsLoading = true;
		receiptsError = null;
		try {
			const result = await deps.listReceipts.execute(poId);
			if (!scope.isCurrent()) return false;
			receipts = result;
			return true;
		} catch (err) {
			if (!scope.isCurrent() || isAbort(err)) return false;
			receiptsError = toUserMessage(err, 'No se pudo cargar el historial de recepciones');
			return false;
		} finally {
			scope.release();
			if (requestId === receiptHistoryRequest) receiptsLoading = false;
		}
	}

	async function lookup() {
		if (loading || submitting || cancelling) return false;
		const code = barcode.trim();
		if (!code) {
			error = 'Indica un PO number o barcode';
			return false;
		}
		const scope = warehouseSelection?.beginScopedRequest() ?? beginWarehouseScopedRequest();
		receiptHistoryRequest += 1;
		receiptsLoading = false;
		loading = true;
		error = null;
		lastResult = null;
		lastCancel = null;
		detail = null;
		drafts = [];
		binsRequest += 1;
		bins = [];
		binsLoading = false;
		binsError = null;
		receipts = [];
		receiptsError = null;
		try {
			const result = await deps.lookupPurchaseOrder.execute(code);
			if (!scope.isCurrent()) return false;
			if (warehouseSelection && warehouseSelection.warehouseId == null) throw new Error('Selecciona un almacén antes de recibir mercancía.');
			if (warehouseSelection?.warehouseId != null && warehouseSelection.warehouseId !== result.purchaseOrder.warehouseId) {
				throw new Error('La orden pertenece a otro almacén. Cambia el contexto de almacén antes de continuar.');
			}
			const binsLoaded = await loadBins(result.purchaseOrder.warehouseId);
			if (!scope.isCurrent() || !binsLoaded) throw new Error(binsError ?? 'No se pudieron cargar los bins del almacén.');
			const defaultBinId = String(bins.find(bin => bin.binType === 'Staging')?.id ?? bins[0]?.id ?? '');
			detail = result;
			drafts = mapDrafts(result, defaultBinId);
			await loadReceiptHistory(result.purchaseOrder.poId);
			return true;
		} catch (err) {
			if (!scope.isCurrent() || isAbort(err)) return false;
			error = toUserMessage(err, 'No se pudo buscar el PO');
			return false;
		} finally {
			scope.release();
			if (scope.isCurrent()) loading = false;
		}
	}

	function setBarcode(value: string) {
		barcode = value;
	}

	function setReceiptIdsInput(value: string) {
		receiptIdsInput = value;
	}

	function updateDraft(index: number, patch: Partial<LineDraft>) {
		drafts = drafts.map((d, i) => (i === index ? { ...d, ...patch } : d));
	}

	function invalidate() {
		receiptHistoryRequest += 1;
		binsRequest += 1;
		bins = [];
		binsLoading = false;
		binsError = null;
		receiptsLoading = false;
		detail = null;
		drafts = [];
		receipts = [];
		receiptsError = null;
		lastUnreceive = null;
		lastResult = null;
		lastCancel = null;
		error = null;
	}

	async function submitReceive(): Promise<boolean> {
		if (submitting || loading || cancelling) return false;
		if (!detail) {
			error = 'Busca un PO primero';
			return false;
		}

		const items: ReceiveLineInput[] = [];
		for (const draft of drafts) {
			if (!draft.quantity || draft.quantity <= 0) continue;
			const binId = Number(draft.binId);
			const selectedBin = bins.find(bin => bin.id === binId && bin.warehouseId === detail!.purchaseOrder.warehouseId && bin.active);
			if (!Number.isInteger(binId) || binId <= 0 || !selectedBin) {
				error = `Bin inválido para ${draft.sku}`;
				return false;
			}
			items.push({
				itemId: draft.itemId,
				quantity: draft.quantity,
				binId,
				lotNumber: draft.lotNumber.trim() || null,
				serialNumber: draft.serialNumber.trim() || null,
				notes: draft.notes.trim() || null
			});
		}

		if (items.length === 0) {
			error = 'Indica al menos una cantidad a recibir';
			return false;
		}

		const scope = warehouseSelection?.beginScopedRequest() ?? beginWarehouseScopedRequest();
		submitting = true;
		error = null;
		lastCancel = null;
		const poNumber = detail.purchaseOrder.poNumber;
		const poId = detail.purchaseOrder.poId;
		try {
			lastResult = await deps.receiveGoods.execute(poId, items);
			if (!scope.isCurrent()) return false;
			if (lastResult.receiptIds.length) {
				receiptIdsInput = lastResult.receiptIds.join(', ');
			}
			const refreshed = await deps.lookupPurchaseOrder.execute(poNumber);
			if (!scope.isCurrent()) return false;
			detail = refreshed;
			drafts = mapDrafts(refreshed);
			await loadReceiptHistory(refreshed.purchaseOrder.poId);
			return true;
		} catch (err) {
			if (!scope.isCurrent() || isAbort(err)) return false;
			error = toUserMessage(err, 'No se pudo registrar la recepción');
			return false;
		} finally {
			scope.release();
			if (scope.isCurrent()) submitting = false;
		}
	}

	async function unreceiveReceipt(receiptId: number, reason: string): Promise<boolean> {
		if (unreceivingId !== null || loading || submitting || cancelling) return false;
		if (!detail) { error = 'Busca un PO primero'; return false; }
		const scope = warehouseSelection?.beginScopedRequest() ?? beginWarehouseScopedRequest();
		unreceivingId = receiptId;
		error = null;
		lastUnreceive = null;
		try {
			lastUnreceive = await deps.unreceiveReceipt.execute(receiptId, reason);
			if (!scope.isCurrent()) return false;
			const refreshed = await deps.lookupPurchaseOrder.execute(detail.purchaseOrder.poNumber);
			if (!scope.isCurrent()) return false;
			detail = refreshed;
			drafts = mapDrafts(refreshed);
			await loadReceiptHistory(refreshed.purchaseOrder.poId);
			return true;
		} catch (err) {
			if (!scope.isCurrent() || isAbort(err)) return false;
			error = toUserMessage(err, 'No se pudo revertir la recepción');
			return false;
		} finally {
			scope.release();
			if (scope.isCurrent()) unreceivingId = null;
		}
	}

	async function cancelReceipts(): Promise<boolean> {
		if (cancelling || loading || submitting) return false;
		if (!detail) {
			error = 'Busca un PO primero';
			return false;
		}
		const ids = receiptIdsInput
			.split(/[\s,;]+/)
			.map((s) => s.trim())
			.filter(Boolean)
			.map((s) => Number(s))
			.filter((n) => Number.isInteger(n) && n > 0);

		if (ids.length === 0) {
			error = 'Indica al menos un receipt_id válido';
			return false;
		}

		const scope = warehouseSelection?.beginScopedRequest() ?? beginWarehouseScopedRequest();
		cancelling = true;
		error = null;
		lastResult = null;
		const poNumber = detail.purchaseOrder.poNumber;
		const poId = detail.purchaseOrder.poId;
		try {
			lastCancel = await deps.cancelReceipts.execute(poId, ids);
			if (!scope.isCurrent()) return false;
			const refreshed = await deps.lookupPurchaseOrder.execute(poNumber);
			if (!scope.isCurrent()) return false;
			detail = refreshed;
			drafts = mapDrafts(refreshed);
			await loadReceiptHistory(refreshed.purchaseOrder.poId);
			return true;
		} catch (err) {
			if (!scope.isCurrent() || isAbort(err)) return false;
			error = toUserMessage(err, 'No se pudo cancelar los recibos');
			return false;
		} finally {
			scope.release();
			if (scope.isCurrent()) cancelling = false;
		}
	}

	return {
		get barcode() { return barcode; },
		get detail() { return detail; },
		get drafts() { return drafts; },
		get loading() { return loading; },
		get submitting() { return submitting; },
		get cancelling() { return cancelling; },
		get error() { return error; },
		get lastResult() { return lastResult; },
		get lastCancel() { return lastCancel; },
		get receiptIdsInput() { return receiptIdsInput; },
		get receipts() { return receipts; },
		get bins() { return bins; },
		get binsLoading() { return binsLoading; },
		get binsError() { return binsError; },
		get receiptsLoading() { return receiptsLoading; },
		get receiptsError() { return receiptsError; },
		get unreceivingId() { return unreceivingId; },
		get lastUnreceive() { return lastUnreceive; },
		get generation() { return warehouseSelection?.generation ?? 0; },
		setBarcode,
		setReceiptIdsInput,
		lookup,
		updateDraft,
		submitReceive,
		cancelReceipts,
		unreceiveReceipt,
		loadReceiptHistory,
		invalidate
	};
}
