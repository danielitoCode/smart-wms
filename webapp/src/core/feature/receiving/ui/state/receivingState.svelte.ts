import { getContext } from 'svelte';
import { createReceivingDependencies } from '../../di/receiving.dependencies';
import type {
	CancelReceiptsResult,
	PurchaseOrderDetail,
	ReceiveLineInput,
	ReceiveResult,
	ReceiptHistoryItem,
	ReceivingBin,
	UnreceiveResult
} from '../../domain/entity/PurchaseOrder';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';
import { beginWarehouseScopedRequest } from '../../../../infrastructure/warehouse/WarehouseRequestScope';
import type { WarehouseSelectionState } from '../../../warehouses/ui/state/warehouseSelectionState.svelte';

const deps = createReceivingDependencies();

export type LineDraft = {
	poLineId: number;
	itemId: number;
	sku: string;
	itemName: string;
	ordered: number;
	received: number;
	remaining: number;
	quantity: number;
	binId: string;
	lotNumber: string;
	serialNumber: string;
};

function isAbort(err: unknown): boolean {
	return (
		(err instanceof DOMException && err.name === 'AbortError') ||
		(err instanceof Error && /abort/i.test(err.message))
	);
}

function mapDrafts(detail: PurchaseOrderDetail, bins: ReceivingBin[] = []): LineDraft[] {
	const preferredBin = bins.find((bin) => bin.binType === 'Staging') ?? bins[0];
	return detail.lines.map((line) => ({
		poLineId: line.poLineId,
		itemId: line.itemId,
		sku: line.sku,
		itemName: line.itemName,
		ordered: line.quantityOrdered,
		received: line.quantityReceived,
		remaining: line.quantityRemaining,
		quantity: 0,
		binId: preferredBin ? String(preferredBin.binId) : '',
		lotNumber: '',
		serialNumber: ''
	}));
}

export function createReceivingState() {
	const warehouseSelection = getContext<WarehouseSelectionState | undefined>('warehouseSelection');

	let barcode = $state('');
	let detail = $state<PurchaseOrderDetail | null>(null);
	let drafts = $state<LineDraft[]>([]);
	let bins = $state<ReceivingBin[]>([]);
	let receipts = $state<ReceiptHistoryItem[]>([]);
	let loading = $state(false);
	let submitting = $state(false);
	let cancelling = $state(false);
	let unreceiving = $state(false);
	let error = $state<string | null>(null);
	let binsError = $state<string | null>(null);
	let lastResult = $state<ReceiveResult | null>(null);
	let lastCancel = $state<CancelReceiptsResult | null>(null);
	let lastUnreceive = $state<UnreceiveResult | null>(null);
	let receiptIdsInput = $state('');
	let pendingItems = $state<ReceiveLineInput[]>([]);
	let cancelConfirmationPending = $state(false);
	let selectedReceipt = $state<ReceiptHistoryItem | null>(null);
	let unreceiveReason = $state('');

	function currentScope() {
		return warehouseSelection?.beginScopedRequest() ?? beginWarehouseScopedRequest();
	}

	async function refreshReceipts(poId: number) {
		receipts = await deps.listReceipts.execute(poId);
	}

	async function refreshDetail(scope: ReturnType<typeof currentScope>, poNumber: string) {
		const refreshed = await deps.lookupPurchaseOrder.execute(poNumber);
		if (!scope.isCurrent()) return false;
		detail = refreshed;
		drafts = mapDrafts(refreshed, bins);
		await refreshReceipts(refreshed.purchaseOrder.poId);
		return scope.isCurrent();
	}

	async function refreshAfterMutation(scope: ReturnType<typeof currentScope>, poNumber: string) {
		try {
			await refreshDetail(scope, poNumber);
		} catch (err) {
			if (scope.isCurrent() && !isAbort(err)) {
				error = toUserMessage(err, 'La operación se completó, pero no se pudo actualizar la vista');
			}
		}
	}

	async function lookup(): Promise<boolean> {
		if (loading || submitting || cancelling || unreceiving) return false;
		const code = barcode.trim();
		if (!code) {
			error = 'Indica un número de orden o código de barras';
			return false;
		}

		const scope = currentScope();
		loading = true;
		error = null;
		binsError = null;
		lastResult = null;
		lastCancel = null;
		lastUnreceive = null;
		detail = null;
		drafts = [];
		receipts = [];
		bins = [];

		try {
			const result = await deps.lookupPurchaseOrder.execute(code);
			if (!scope.isCurrent()) return false;
			detail = result;
			drafts = mapDrafts(result);

			const [receiptResult, binResult] = await Promise.allSettled([
				deps.listReceipts.execute(result.purchaseOrder.poId),
				deps.listBins.execute(result.purchaseOrder.warehouseId)
			]);
			if (!scope.isCurrent()) return false;

			if (receiptResult.status === 'fulfilled') receipts = receiptResult.value;
			else error = toUserMessage(receiptResult.reason, 'No se pudo cargar el historial de recepciones');

			if (binResult.status === 'fulfilled') {
				bins = binResult.value;
				drafts = mapDrafts(result, bins);
			} else {
				binsError = toUserMessage(binResult.reason, 'No se pudieron cargar los bins del almacén');
			}
			return true;
		} catch (err) {
			if (!scope.isCurrent() || isAbort(err)) return false;
			error = toUserMessage(err, 'No se pudo buscar la orden de compra');
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

	function updateDraft(poLineId: number, patch: Partial<LineDraft>) {
		drafts = drafts.map((draft) =>
			draft.poLineId === poLineId ? { ...draft, ...patch } : draft
		);
	}

	function prepareReceive(): boolean {
		if (submitting || loading || cancelling || unreceiving) return false;
		if (!detail) {
			error = 'Busca una orden de compra primero';
			return false;
		}
		if (!['OPEN', 'PARTIAL'].includes(detail.purchaseOrder.status)) {
			error = 'La orden no está abierta para recibir mercancía';
			return false;
		}

		const items: ReceiveLineInput[] = [];
		for (const draft of drafts) {
			if (!Number.isInteger(draft.quantity) || draft.quantity < 0) {
				error = `Cantidad inválida para ${draft.sku}`;
				return false;
			}
			if (draft.quantity === 0) continue;
			const binId = Number(draft.binId);
			if (!Number.isInteger(binId) || binId <= 0) {
				error = `Selecciona un bin válido para ${draft.sku}`;
				return false;
			}
			items.push({
				itemId: draft.itemId,
				quantity: draft.quantity,
				binId,
				lotNumber: draft.lotNumber.trim() || null,
				serialNumber: draft.serialNumber.trim() || null
			});
		}
		if (items.length === 0) {
			error = 'Indica al menos una cantidad a recibir';
			return false;
		}

		pendingItems = items;
		error = null;
		return true;
	}

	function clearReceiveConfirmation() {
		pendingItems = [];
	}

	async function submitReceive(): Promise<boolean> {
		if (!detail || pendingItems.length === 0 || submitting || loading || cancelling || unreceiving) {
			return false;
		}
		const scope = currentScope();
		submitting = true;
		error = null;
		lastCancel = null;
		lastUnreceive = null;
		const poNumber = detail.purchaseOrder.poNumber;
		try {
			lastResult = await deps.receiveGoods.execute(detail.purchaseOrder.poId, pendingItems);
			if (!scope.isCurrent()) return false;
			receiptIdsInput = lastResult.receiptIds.join(', ');
			pendingItems = [];
			await refreshAfterMutation(scope, poNumber);
			return scope.isCurrent();
		} catch (err) {
			if (!scope.isCurrent() || isAbort(err)) return false;
			error = toUserMessage(err, 'No se pudo registrar la recepción');
			return false;
		} finally {
			scope.release();
			if (scope.isCurrent()) submitting = false;
		}
	}

	function requestCancel(): boolean {
		if (!detail || cancelling || submitting || unreceiving) return false;
		const ids = receiptIdsInput
			.split(/[\s,;]+/)
			.map((value) => Number(value.trim()))
			.filter((value) => Number.isInteger(value) && value > 0);
		if (ids.length === 0) {
			error = 'Indica al menos un receipt_id válido';
			return false;
		}
		cancelConfirmationPending = true;
		error = null;
		return true;
	}

	function clearCancelConfirmation() {
		cancelConfirmationPending = false;
	}

	async function cancelReceipts(): Promise<boolean> {
		if (!detail || !cancelConfirmationPending || cancelling || submitting || unreceiving) return false;
		const ids = receiptIdsInput
			.split(/[\s,;]+/)
			.map((value) => Number(value.trim()))
			.filter((value) => Number.isInteger(value) && value > 0);
		if (ids.length === 0) return false;

		const scope = currentScope();
		cancelling = true;
		error = null;
		lastResult = null;
		const poNumber = detail.purchaseOrder.poNumber;
		try {
			lastCancel = await deps.cancelReceipts.execute(detail.purchaseOrder.poId, ids);
			if (!scope.isCurrent()) return false;
			receiptIdsInput = '';
			cancelConfirmationPending = false;
			await refreshAfterMutation(scope, poNumber);
			return scope.isCurrent();
		} catch (err) {
			if (!scope.isCurrent() || isAbort(err)) return false;
			error = toUserMessage(err, 'No se pudieron cancelar las recepciones');
			return false;
		} finally {
			scope.release();
			if (scope.isCurrent()) cancelling = false;
		}
	}

	function requestUnreceive(receipt: ReceiptHistoryItem) {
		selectedReceipt = receipt;
		unreceiveReason = '';
		error = null;
	}

	function setUnreceiveReason(value: string) {
		unreceiveReason = value;
	}

	function clearUnreceive() {
		selectedReceipt = null;
		unreceiveReason = '';
	}

	async function confirmUnreceive(): Promise<boolean> {
		if (!detail || !selectedReceipt || unreceiving || submitting || cancelling) return false;
		const scope = currentScope();
		unreceiving = true;
		error = null;
		const poNumber = detail.purchaseOrder.poNumber;
		try {
			lastUnreceive = await deps.unreceiveReceipt.execute(
				selectedReceipt.receiptId,
				unreceiveReason
			);
			if (!scope.isCurrent()) return false;
			selectedReceipt = null;
			unreceiveReason = '';
			await refreshAfterMutation(scope, poNumber);
			return scope.isCurrent();
		} catch (err) {
			if (!scope.isCurrent() || isAbort(err)) return false;
			error = toUserMessage(err, 'No se pudo revertir el recibo');
			return false;
		} finally {
			scope.release();
			if (scope.isCurrent()) unreceiving = false;
		}
	}

	function invalidate() {
		detail = null;
		drafts = [];
		bins = [];
		receipts = [];
		pendingItems = [];
		cancelConfirmationPending = false;
		selectedReceipt = null;
		lastResult = null;
		lastCancel = null;
		lastUnreceive = null;
		error = null;
		binsError = null;
	}

	return {
		get barcode() { return barcode; },
		get detail() { return detail; },
		get drafts() { return drafts; },
		get bins() { return bins; },
		get receipts() { return receipts; },
		get loading() { return loading; },
		get submitting() { return submitting; },
		get cancelling() { return cancelling; },
		get unreceiving() { return unreceiving; },
		get error() { return error; },
		get binsError() { return binsError; },
		get lastResult() { return lastResult; },
		get lastCancel() { return lastCancel; },
		get lastUnreceive() { return lastUnreceive; },
		get receiptIdsInput() { return receiptIdsInput; },
		get pendingItems() { return pendingItems; },
		get cancelConfirmationPending() { return cancelConfirmationPending; },
		get selectedReceipt() { return selectedReceipt; },
		get unreceiveReason() { return unreceiveReason; },
		get generation() { return warehouseSelection?.generation ?? 0; },
		setBarcode,
		setReceiptIdsInput,
		updateDraft,
		lookup,
		prepareReceive,
		clearReceiveConfirmation,
		submitReceive,
		requestCancel,
		clearCancelConfirmation,
		cancelReceipts,
		requestUnreceive,
		setUnreceiveReason,
		clearUnreceive,
		confirmUnreceive,
		invalidate
	};
}
