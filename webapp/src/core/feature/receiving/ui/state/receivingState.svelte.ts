import { getContext } from 'svelte';
import { createReceivingDependencies } from '../../di/receiving.dependencies';
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

export type LineDraft = {
	itemId: number;
	sku: string;
	itemName: string;
	remaining: number;
	quantity: number;
	binId: string;
	lotNumber: string;
};

function isAbort(err: unknown): boolean {
	return (
		(err instanceof DOMException && err.name === 'AbortError') ||
		(err instanceof Error && /abort/i.test(err.message))
	);
}

function mapDrafts(detail: PurchaseOrderDetail): LineDraft[] {
	return detail.lines
		.filter((line) => line.quantityRemaining > 0)
		.map((line) => ({
			itemId: line.itemId,
			sku: line.sku,
			itemName: line.itemName,
			remaining: line.quantityRemaining,
			quantity: line.quantityRemaining,
			binId: '',
			lotNumber: ''
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

	async function lookup() {
		if (loading || submitting || cancelling) return false;
		const code = barcode.trim();
		if (!code) {
			error = 'Indica un PO number o barcode';
			return false;
		}
		const scope = warehouseSelection?.beginScopedRequest() ?? beginWarehouseScopedRequest();
		loading = true;
		error = null;
		lastResult = null;
		lastCancel = null;
		detail = null;
		drafts = [];
		try {
			const result = await deps.lookupPurchaseOrder.execute(code);
			if (!scope.isCurrent()) return false;
			detail = result;
			drafts = mapDrafts(result);
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
		detail = null;
		drafts = [];
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
			if (!Number.isInteger(binId) || binId <= 0) {
				error = `Bin inválido para ${draft.sku}`;
				return false;
			}
			items.push({
				itemId: draft.itemId,
				quantity: draft.quantity,
				binId,
				lotNumber: draft.lotNumber.trim() || null
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
		get generation() { return warehouseSelection?.generation ?? 0; },
		setBarcode,
		setReceiptIdsInput,
		lookup,
		updateDraft,
		submitReceive,
		cancelReceipts,
		invalidate
	};
}
