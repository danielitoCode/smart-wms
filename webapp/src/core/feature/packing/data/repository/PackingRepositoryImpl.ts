import type { PackingRepository } from '../../domain/repository/PackingRepository';
import type {
	PackingOrderDetail,
	SimpleMessageResult,
	VerifyPackInput,
	VerifyPackResult
} from '../../domain/entity/Packing';
import type { PackingRemoteDataSource } from '../datasource/PackingRemoteDataSource';
import { PackingMapper } from '../mapper/PackingMapper';

export class PackingRepositoryImpl implements PackingRepository {
	constructor(private readonly datasource: PackingRemoteDataSource) {}

	async loadOrder(barcode: string, warehouseId: number): Promise<PackingOrderDetail> {
		return PackingMapper.toDetail(await this.datasource.loadOrder(barcode, warehouseId));
	}

	async verify(input: VerifyPackInput): Promise<VerifyPackResult> {
		return PackingMapper.toVerifyResult(await this.datasource.verify(input));
	}

	async complete(soId: number, warehouseId: number): Promise<SimpleMessageResult> {
		return PackingMapper.toMessage(await this.datasource.complete(soId, warehouseId));
	}
}
