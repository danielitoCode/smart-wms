import type { InboundActivityRepository } from '../repository/InboundActivityRepository';
import { INBOUND_RESOURCES, type InboundActivityQuery, type InboundActivityStatus } from '../entity/InboundActivity';
export class ListInboundActivityUseCase {
	constructor(private readonly repository: InboundActivityRepository) {}
	execute(query: InboundActivityQuery = {}) {
		const page = query.page ?? 1, perPage = query.perPage ?? 50;
		if (!Number.isInteger(page) || page < 1) throw new Error('La página debe ser >= 1');
		if (!Number.isInteger(perPage) || perPage < 1 || perPage > 500) throw new Error('El tamaño de página debe estar entre 1 y 500');
		if (query.resource && !INBOUND_RESOURCES.includes(query.resource)) throw new Error('Recurso inbound inválido');
		if (query.status && !(['applied', 'superseded'] as InboundActivityStatus[]).includes(query.status)) throw new Error('Estado inbound inválido');
		if (query.since && query.until && new Date(query.since) > new Date(query.until)) throw new Error('El rango de fechas no es válido');
		return this.repository.list({ ...query, page, perPage });
	}
}
export class GetInboundActivityDetailUseCase {
	constructor(private readonly repository: InboundActivityRepository) {}
	execute(resource: string, inboundId: number) {
		if (!INBOUND_RESOURCES.includes(resource as (typeof INBOUND_RESOURCES)[number]) || !Number.isInteger(inboundId) || inboundId <= 0) throw new Error('Recurso o id inbound inválido');
		return this.repository.getDetail(resource, inboundId);
	}
}
