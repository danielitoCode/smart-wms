import type { InboundActivityRepository, InboundActivityPage } from '../../domain/repository/InboundActivityRepository';
import type { InboundActivityDetail, InboundActivityQuery } from '../../domain/entity/InboundActivity';
import { InboundActivityRemoteDataSource } from '../datasource/InboundActivityRemoteDataSource';
import { InboundActivityMapper } from '../mapper/InboundActivityMapper';
export class InboundActivityRepositoryImpl implements InboundActivityRepository {
	constructor(private readonly remote: InboundActivityRemoteDataSource) {}
	async list(query: InboundActivityQuery = {}): Promise<InboundActivityPage> {
		const response = await this.remote.list(query);
		return { rows: response.rows.map(InboundActivityMapper.toDomain), page: response.page,
			perPage: response.per_page, total: response.total, hasNext: response.has_next };
	}
	async getDetail(resource: string, inboundId: number): Promise<InboundActivityDetail> {
		return InboundActivityMapper.toDetail(await this.remote.getDetail(resource, inboundId));
	}
}
