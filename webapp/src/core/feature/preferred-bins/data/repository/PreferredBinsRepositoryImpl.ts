import type { PreferredBin, PreferredBinCandidate, PreferredBinListQuery } from '../../domain/entity/PreferredBin';
import type { PreferredBinsRepository } from '../../domain/repository/PreferredBinsRepository';
import type { PreferredBinsRemoteDataSource } from '../datasource/PreferredBinsRemoteDataSource';
import { PreferredBinMapper as M } from '../mapper/PreferredBinMapper';

export class PreferredBinsRepositoryImpl implements PreferredBinsRepository {
	constructor(private readonly remote: PreferredBinsRemoteDataSource) {}

	async list(query?: PreferredBinListQuery): Promise<PreferredBin[]> {
		return (await this.remote.list(query)).map(M.toDomain);
	}

	create(value: PreferredBinCandidate) {
		return this.remote.create(M.toCreateDto(value)).then(() => undefined);
	}

	update(id: number, priority: number) {
		return this.remote.update(id, M.toUpdateDto({ priority })).then(() => undefined);
	}

	remove(id: number) {
		return this.remote.remove(id).then(() => undefined);
	}
}
