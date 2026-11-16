import type { InboundActivityQuery } from '../entity/InboundActivity';
import { INBOUND_RESOURCES, type InboundActivityStatus } from '../entity/InboundActivity';
import type { InboundActivityRepository } from '../repository/InboundActivityRepository';

function validateDateRange(query: InboundActivityQuery): void {
	const since = query.since ? Date.parse(query.since) : null;
	const until = query.until ? Date.parse(query.until) : null;

	if (since !== null && !Number.isFinite(since)) {
		throw new Error('La fecha inicial no es válida');
	}
	if (until !== null && !Number.isFinite(until)) {
		throw new Error('La fecha final no es válida');
	}
	if (since !== null && until !== null && since > until) {
		throw new Error('El rango de fechas no es válido');
	}
}

export class ListInboundActivityUseCase {
	constructor(private readonly repository: InboundActivityRepository) {}

	execute(query: InboundActivityQuery = {}) {
		const page = query.page ?? 1;
		const perPage = query.perPage ?? 50;

		if (!Number.isInteger(page) || page < 1) {
			throw new Error('La página debe ser >= 1');
		}
		if (!Number.isInteger(perPage) || perPage < 1 || perPage > 500) {
			throw new Error('El tamaño de página debe estar entre 1 y 500');
		}
		if (query.resource && !INBOUND_RESOURCES.includes(query.resource)) {
			throw new Error('Recurso inbound inválido');
		}
		if (
			query.status &&
			!(['applied', 'superseded'] as InboundActivityStatus[]).includes(query.status)
		) {
			throw new Error('Estado inbound inválido');
		}

		validateDateRange(query);
		return this.repository.list({ ...query, page, perPage });
	}
}

export class GetInboundActivityDetailUseCase {
	constructor(private readonly repository: InboundActivityRepository) {}

	execute(resource: string, inboundId: number) {
		if (
			!INBOUND_RESOURCES.includes(resource as (typeof INBOUND_RESOURCES)[number]) ||
			!Number.isInteger(inboundId) ||
			inboundId <= 0
		) {
			throw new Error('Recurso o id inbound inválido');
		}
		return this.repository.getDetail(resource, inboundId);
	}
}

export class FilterInboundActivityUseCase {
	constructor(private readonly repository: InboundActivityRepository) {}

	execute(query: InboundActivityQuery = {}) {
		return new ListInboundActivityUseCase(this.repository).execute({ ...query, page: 1 });
	}
}
