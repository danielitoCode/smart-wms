import { createInboundActivityDependencies } from '../../di/inboundActivity.dependencies';
import type { InboundActivityDetail, InboundActivityQuery, InboundActivityResource, InboundActivityRow, InboundActivityStatus } from '../../domain/entity/InboundActivity';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';
const deps = createInboundActivityDependencies();
export function createInboundActivityState() {
	let rows = $state<InboundActivityRow[]>([]), detail = $state<InboundActivityDetail | null>(null);
	let loading = $state(false), detailLoading = $state(false), error = $state<string | null>(null), detailError = $state<string | null>(null);
	let resource = $state<InboundActivityResource | ''>(''), sourceSystem = $state('');
	let status = $state<InboundActivityStatus | ''>(''), since = $state(''), until = $state('');
	let page = $state(1), perPage = $state(50), total = $state(0), hasNext = $state(false);
	function query(): InboundActivityQuery { return { resource: resource || undefined, sourceSystem: sourceSystem.trim() || undefined,
		status: status || undefined, since: since ? new Date(since).toISOString() : undefined, until: until ? new Date(until).toISOString() : undefined, page, perPage }; }
	async function load() {
		loading = true; error = null;
		try { const result = await deps.list.execute(query()); rows = result.rows; page = result.page;
			perPage = result.perPage; total = result.total; hasNext = result.hasNext; }
		catch (cause) { error = toUserMessage(cause, 'No se pudo cargar la actividad inbound'); rows = []; }
		finally { loading = false; }
	}
	async function applyFilters() { page = 1; await load(); }
	async function openDetail(row: InboundActivityRow) {
		detail = null; detailError = null; detailLoading = true;
		try { detail = await deps.getDetail.execute(row.resource, row.inboundId); }
		catch (cause) { detailError = toUserMessage(cause, 'No se pudo cargar el detalle inbound'); }
		finally { detailLoading = false; }
	}
	return {
		get rows() { return rows; }, get detail() { return detail; }, get loading() { return loading; },
		get detailLoading() { return detailLoading; }, get error() { return error; }, get detailError() { return detailError; },
		get resource() { return resource; }, get sourceSystem() { return sourceSystem; }, get status() { return status; },
		get since() { return since; }, get until() { return until; }, get page() { return page; },
		get perPage() { return perPage; }, get total() { return total; }, get hasNext() { return hasNext; },
		setResource(v: InboundActivityResource | '') { resource = v; }, setSourceSystem(v: string) { sourceSystem = v; },
		setStatus(v: InboundActivityStatus | '') { status = v; }, setSince(v: string) { since = v; }, setUntil(v: string) { until = v; },
		setPage(v: number) { page = v; }, clearDetail() { detail = null; detailError = null; }, load, applyFilters, openDetail
	};
}
