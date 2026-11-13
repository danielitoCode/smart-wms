import { createAuditLogDependencies } from '../../di/auditLog.dependencies';
import type { AuditLogEntry, AuditLogQuery } from '../../domain/entity/AuditLogEntry';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createAuditLogDependencies();

export function createAuditLogState() {
	let rows = $state<AuditLogEntry[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let actionType = $state('');
	let entityType = $state('');
	let page = $state(1);
	let perPage = $state(50);
	let total = $state(0);

	async function load(extra: Partial<AuditLogQuery> = {}) {
		if (loading) return;
		loading = true;
		error = null;
		try {
			const result = await deps.list.execute({
				actionType: actionType || undefined,
				entityType: entityType || undefined,
				page,
				perPage,
				...extra
			});
			rows = result.rows;
			page = result.page;
			perPage = result.perPage;
			total = result.total;
		} catch (e) {
			error = toUserMessage(e, 'No se pudo cargar el registro de auditoría');
		} finally {
			loading = false;
		}
	}

	return {
		get rows() { return rows; },
		get loading() { return loading; },
		get error() { return error; },
		get actionType() { return actionType; },
		get entityType() { return entityType; },
		get page() { return page; },
		get perPage() { return perPage; },
		get total() { return total; },
		setActionType(v: string) { actionType = v; },
		setEntityType(v: string) { entityType = v; },
		setPage(v: number) { page = v; },
		load
	};
}
