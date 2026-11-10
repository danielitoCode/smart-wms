import { createReceivingDependencies } from '../../di/receiving.dependencies';
import type {
	PurchaseOrderDetail,
	ReceiveLineInput,
	ReceiveResult
} from '../../domain/entity/PurchaseOrder';

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

export function createReceivingState() {
	let barcode = $state('');
	let detail = $state<PurchaseOrderDetail | null>(null);
	let drafts = $state<LineDraft[]>([]);
	let loading = $state(false);
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let lastResult = $state<ReceiveResult | null>(null);

	async function lookup() {
		loading = true;
		error = null;
		lastResult = null;
		detail = null;
		drafts = [];
		try {
			const result = await deps.lookupPurchaseOrder.execute(barcode);
			detail = result;
			drafts = result.lines
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
		} catch (err) {
			error = err instanceof Error ? err.message : 'No se pudo buscar el PO';
		} finally {
			loading = false;
		}
	}

	function setBarcode(value: string) {
		barcode = value;
	}

	function updateDraft(index: number, patch: Partial<LineDraft>) {
		drafts = drafts.map((d, i) => (i === index ? { ...d, ...patch } : d));
	}

	async function submitReceive(): Promise<boolean> {
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

		submitting = true;
		error = null;
		try {
			lastResult = await deps.receiveGoods.execute(detail.purchaseOrder.poId, items);
			const refreshed = await deps.lookupPurchaseOrder.execute(
				detail.purchaseOrder.poNumber
			);
			detail = refreshed;
			drafts = refreshed.lines
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
			return true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'No se pudo registrar la recepción';
			return false;
		} finally {
			submitting = false;
		}
	}

	return {
		get barcode() {
			return barcode;
		},
		get detail() {
			return detail;
		},
		get drafts() {
			return drafts;
		},
		get loading() {
			return loading;
		},
		get submitting() {
			return submitting;
		},
		get error() {
			return error;
		},
		get lastResult() {
			return lastResult;
		},
		setBarcode,
		lookup,
		updateDraft,
		submitReceive
	};
}
