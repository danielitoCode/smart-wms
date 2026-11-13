import type { InboundActivityRepository } from '../repository/InboundActivityRepository';
import type { InboundActivityQuery } from '../entity/InboundActivity';

export class ListInboundActivityUseCase {
	constructor(private readonly repository: InboundActivityRepository) {}
	execute(query: InboundActivityQuery = {}) {
		const page = query.page ?? 1;
		const perPage = query.perPage ?? 50;
		if (page < 1) throw new Error('La página debe ser >= 1');
		return this.repository.list({ ...query, page, perPage });
	}
}

export class GetInboundActivityDetailUseCase {
	constructor(private readonly repository: InboundActivityRepository) {}
	execute(resource: string, inboundId: number) {
		if (!resource.trim() || inboundId <= 0) throw new Error('Recurso o id inválido');
		return this.repository.getDetail(resource, inboundId);
	}
}
