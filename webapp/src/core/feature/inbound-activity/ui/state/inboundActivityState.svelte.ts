import { createInboundActivityDependencies } from '../../di/inboundActivity.dependencies';
import type { InboundActivityDetail, InboundActivityRow } from '../../domain/entity/InboundActivity';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createInboundActivityDependencies();

export function createInboundActivityState() {
	let rows = $state<InboundActivityRow[]>([]);
	let detail = $state<InboundActivityDetail | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let resource = $state('');
	let page = $state(1);
	let perPage = $state(50);
	let total = $state(0);

	async function load() {
		if (loading) return;
		loading = true; error = null;
		try {
			const result = await deps.list.execute({
				resource: resource || undefined,
				page,
				perPage
			});
			rows = result.rows;
			page = result.page;
			perPage = result.perPage;
			total = result.total;
		} catch (e) {
			error = toUserMessage(e, 'No se pudo cargar la actividad inbound');
		} finally { loading = false; }
	}

	async function openDetail(resourceName: string, inboundId: number) {
		error = null;
		try { detail = await deps.getDetail.execute(resourceName, inboundId); }
		catch (e) { error = toUserMessage(e, 'No se pudo cargar el detalle'); detail = null; }
	}

	return {
		get rows() { return rows; },
		get detail() { return detail; },
		get loading() { return loading; },
		get error() { return error; },
		get resource() { return resource; },
		get page() { return page; },
		get perPage() { return perPage; },
		get total() { return total; },
		setResource(v: string) { resource = v; },
		setPage(v: number) { page = v; },
		clearDetail() { detail = null; },
		load, openDetail
	};
}
