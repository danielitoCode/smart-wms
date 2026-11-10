import type { PackingRepository } from '../../domain/repository/PackingRepository';
import type {
	PackingOrderDetail,
	SimpleMessageResult,
	VerifyPackInput
} from '../../domain/entity/Packing';
import type { PackingRemoteDataSource } from '../datasource/PackingRemoteDataSource';
import { PackingMapper } from '../mapper/PackingMapper';

export class PackingRepositoryImpl implements PackingRepository {
	constructor(private readonly datasource: PackingRemoteDataSource) {}

	async loadOrder(barcode: string): Promise<PackingOrderDetail> {
		return PackingMapper.toDetail(await this.datasource.loadOrder(barcode));
	}

	async verify(input: VerifyPackInput): Promise<SimpleMessageResult> {
		return PackingMapper.toMessage(await this.datasource.verify(input));
	}

	async complete(soId: number): Promise<SimpleMessageResult> {
		return PackingMapper.toMessage(await this.datasource.complete(soId));
	}
}
