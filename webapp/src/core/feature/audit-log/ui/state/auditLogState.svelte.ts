import { createAuditLogDependencies } from '../../di/auditLog.dependencies';
import type { AuditEvent, AuditLogQuery } from '../../domain/entity/AuditLogEntry';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createAuditLogDependencies();

export function createAuditLogState() {
	let rows = $state<AuditEvent[]>([]);
	let selected = $state<AuditEvent | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let actionType = $state('');
	let actor = $state('');
	let itemId = $state('');
	let startDate = $state('');
	let endDate = $state('');
	let page = $state(1);
	let perPage = $state(50);
	let total = $state(0);
	let pages = $state(1);
	let sortBy = $state<NonNullable<AuditLogQuery['sortBy']>>('created_at');
	let sortDirection = $state<NonNullable<AuditLogQuery['sortDirection']>>('desc');
	let requestId = 0;

	function query(): AuditLogQuery {
		return {
			actionType: actionType.trim() || undefined,
			actor: actor.trim() || undefined,
			itemId: itemId.trim() ? Number(itemId) : undefined,
			startDate: startDate || undefined,
			endDate: endDate || undefined,
			page, perPage, sortBy, sortDirection
		};
	}

	async function load() {
		const currentRequest = ++requestId;
		loading = true;
		error = null;
		try {
			const result = await deps.list.execute(query());
			if (currentRequest !== requestId) return;
			rows = result.rows;
			page = result.page;
			perPage = result.perPage;
			total = result.total;
			pages = result.pages;
			if (selected) selected = rows.find((row) => row.logId === selected?.logId) ?? selected;
		} catch (e) {
			if (currentRequest === requestId) error = toUserMessage(e, 'No se pudo cargar el registro de auditoría');
		} finally {
			if (currentRequest === requestId) loading = false;
		}
	}

	async function applyFilters() {
		if (itemId.trim() && (!Number.isInteger(Number(itemId)) || Number(itemId) < 1)) {
			error = 'El ID de artículo debe ser un entero positivo.';
			return;
		}
		if (startDate && endDate && startDate > endDate) {
			error = 'La fecha inicial no puede ser posterior a la fecha final.';
			return;
		}
		page = 1;
		await load();
	}

	async function changePerPage(next: number) {
		if (!Number.isInteger(next) || next < 1 || next > 1000 || loading) return;
		perPage = next;
		page = 1;
		await load();
	}

	async function changePage(next: number) {
		if (next < 1 || next > pages || loading) return;
		page = next;
		await load();
	}

	async function changeSort(key: NonNullable<AuditLogQuery['sortBy']>) {
		if (sortBy === key) sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		else { sortBy = key; sortDirection = key === 'created_at' ? 'desc' : 'asc'; }
		page = 1;
		await load();
	}

	function clearFilters() {
		actionType = '';
		actor = '';
		itemId = '';
		startDate = '';
		endDate = '';
		page = 1;
		void load();
	}

	return {
		get rows() { return rows; }, get selected() { return selected; },
		get loading() { return loading; }, get error() { return error; },
		get actionType() { return actionType; }, get actor() { return actor; },
		get itemId() { return itemId; }, get startDate() { return startDate; },
		get endDate() { return endDate; }, get page() { return page; },
		get perPage() { return perPage; }, get total() { return total; },
		get pages() { return pages; }, get sortBy() { return sortBy; },
		get sortDirection() { return sortDirection; },
		setActionType(v: string) { actionType = v; },
		setActor(v: string) { actor = v; },
		setItemId(v: string) { itemId = v; },
		setStartDate(v: string) { startDate = v; },
		setEndDate(v: string) { endDate = v; },
		openDetail(row: AuditEvent) { selected = row; },
		closeDetail() { selected = null; },
		applyFilters, clearFilters, changePage, changePerPage, changeSort, load
	};
}
