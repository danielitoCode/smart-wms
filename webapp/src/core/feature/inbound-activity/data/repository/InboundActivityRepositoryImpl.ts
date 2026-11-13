import type { InboundActivityRepository, InboundActivityPage } from '../../domain/repository/InboundActivityRepository';
import type { InboundActivityDetail, InboundActivityQuery } from '../../domain/entity/InboundActivity';
import { InboundActivityRemoteDataSource } from '../datasource/InboundActivityRemoteDataSource';
import { InboundActivityMapper } from '../mapper/InboundActivityMapper';

export class InboundActivityRepositoryImpl implements InboundActivityRepository {
	constructor(private readonly remote: InboundActivityRemoteDataSource) {}

	async list(query: InboundActivityQuery = {}): Promise<InboundActivityPage> {
		const response = await this.remote.list(query);
		const raw = response.activity ?? response.rows ?? [];
		return {
			rows: raw.map(InboundActivityMapper.toDomain),
			page: response.page ?? query.page ?? 1,
			perPage: response.per_page ?? query.perPage ?? 50,
			total: response.total ?? raw.length
		};
	}

	async getDetail(resource: string, inboundId: number): Promise<InboundActivityDetail> {
		return InboundActivityMapper.toDetail(await this.remote.getDetail(resource, inboundId));
	}
}
