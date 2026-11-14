import type {
	InventoryAdjustment,
	CreateInventoryAdjustment,
	InventoryAdjustmentDecision
} from '../../domain/entity/InventoryAdjustment';
import type {
	AdjustmentListQuery,
	InventoryAdjustmentsRepository
} from '../../domain/repository/InventoryAdjustmentsRepository';
import type { InventoryAdjustmentsRemoteDataSource } from '../datasource/InventoryAdjustmentsRemoteDataSource';
import { InventoryAdjustmentMapper } from '../mapper/InventoryAdjustmentMapper';

export class InventoryAdjustmentsRepositoryImpl implements InventoryAdjustmentsRepository {
	constructor(private readonly remote: InventoryAdjustmentsRemoteDataSource) {}

	async list(query?: AdjustmentListQuery): Promise<InventoryAdjustment[]> {
		return (await this.remote.list(query)).map(InventoryAdjustmentMapper.toDomain);
	}

	async pending(query?: Omit<AdjustmentListQuery, 'status'>): Promise<InventoryAdjustment[]> {
		return (await this.remote.pending(query)).map(InventoryAdjustmentMapper.toDomain);
	}

	async createDirect(input: CreateInventoryAdjustment): Promise<void> {
		await this.remote.createDirect(InventoryAdjustmentMapper.createDto(input));
	}

	async review(decisions: InventoryAdjustmentDecision[]): Promise<void> {
		await this.remote.review(InventoryAdjustmentMapper.reviewDto(decisions));
	}
}
