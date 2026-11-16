import { createInboundActivityDependencies } from '../../di/inboundActivity.dependencies';
import type { InboundActivityDetail, InboundActivityQuery, InboundActivityResource, InboundActivityRow, InboundActivityStatus } from '../../domain/entity/InboundActivity';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

type InboundActivityDependencies = ReturnType<typeof createInboundActivityDependencies>;

export function createInboundActivityState(dependencies: InboundActivityDependencies = createInboundActivityDependencies()) {
	let rows = $state<InboundActivityRow[]>([]);
	let detail = $state<InboundActivityDetail | null>(null);
	let loading = $state(false);
	let detailLoading = $state(false);
	let error = $state<string | null>(null);
	let detailError = $state<string | null>(null);
	let resource = $state<InboundActivityResource | ''>('');
	let sourceSystem = $state('');
	let status = $state<InboundActivityStatus | ''>('');
	let since = $state('');
	let until = $state('');
	let page = $state(1);
	let perPage = $state(50);
	let total = $state(0);
	let hasNext = $state(false);
	let listRequestId = 0;
	let detailRequestId = 0;

	function query(): InboundActivityQuery {
		return {
			resource: resource || undefined,
			sourceSystem: sourceSystem.trim() || undefined,
			status: status || undefined,
			since: since ? new Date(since).toISOString() : undefined,
			until: until ? new Date(until).toISOString() : undefined,
			page,
			perPage
		};
	}

	async function load(filtered = false): Promise<void> {
		const requestId = ++listRequestId;
		loading = true;
		error = null;
		try {
			const result = filtered
				? await dependencies.filter.execute(query())
				: await dependencies.list.execute(query());
			if (requestId !== listRequestId) return;
			rows = result.rows;
			page = result.page;
			perPage = result.perPage;
			total = result.total;
			hasNext = result.hasNext;
		} catch (cause) {
			if (requestId !== listRequestId) return;
			error = toUserMessage(cause, 'No se pudo cargar la actividad inbound');
		} finally {
			if (requestId === listRequestId) loading = false;
		}
	}

	async function applyFilters(): Promise<void> {
		page = 1;
		await load(true);
	}

	async function openDetail(row: InboundActivityRow): Promise<void> {
		const requestId = ++detailRequestId;
		detail = null;
		detailError = null;
		detailLoading = true;
		try {
			const result = await dependencies.getDetail.execute(row.resource, row.inboundId);
			if (requestId === detailRequestId) detail = result;
		} catch (cause) {
			if (requestId === detailRequestId) {
				detailError = toUserMessage(cause, 'No se pudo cargar el detalle inbound');
			}
		} finally {
			if (requestId === detailRequestId) detailLoading = false;
		}
	}

	function clearDetail(): void {
		++detailRequestId;
		detail = null;
		detailError = null;
		detailLoading = false;
	}

	return {
		get rows() { return rows; },
		get detail() { return detail; },
		get loading() { return loading; },
		get detailLoading() { return detailLoading; },
		get error() { return error; },
		get detailError() { return detailError; },
		get resource() { return resource; },
		get sourceSystem() { return sourceSystem; },
		get status() { return status; },
		get since() { return since; },
		get until() { return until; },
		get page() { return page; },
		get perPage() { return perPage; },
		get total() { return total; },
		get hasNext() { return hasNext; },
		setResource(value: InboundActivityResource | '') { resource = value; },
		setSourceSystem(value: string) { sourceSystem = value; },
		setStatus(value: InboundActivityStatus | '') { status = value; },
		setSince(value: string) { since = value; },
		setUntil(value: string) { until = value; },
		setPage(value: number) { page = value; },
		clearDetail,
		load,
		applyFilters,
		openDetail
	};
}
