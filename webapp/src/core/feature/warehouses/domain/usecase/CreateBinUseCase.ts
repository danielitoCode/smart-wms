import type { Bin, BinType, CreateBinInput } from '../entity/Warehouse';
import type { WarehouseManagementRepository } from '../repository/WarehouseManagementRepository';

const TYPES: BinType[] = ['Staging', 'PickableStaging', 'Pickable'];

function validateNonNegativeInteger(value: number | null | undefined, name: string): void {
	if (value != null && (!Number.isInteger(value) || value < 0)) {
		throw new Error(name + ' must be a non-negative integer');
	}
}

function validateCapacity(value: number | null | undefined, name: string): void {
	if (value != null && (!Number.isFinite(value) || value < 0)) {
		throw new Error(name + ' must be a non-negative number');
	}
}

export class CreateBinUseCase {
	constructor(private readonly repository: WarehouseManagementRepository) {}

	async execute(input: CreateBinInput): Promise<Bin> {
		const code = input.code?.trim() ?? '';
		const barcode = input.barcode?.trim() ?? '';

		if (!Number.isInteger(input.warehouseId) || input.warehouseId <= 0) {
			throw new Error('warehouseId must be a positive integer');
		}
		if (!Number.isInteger(input.zoneId) || input.zoneId <= 0) {
			throw new Error('zoneId must be a positive integer');
		}
		if (!code || code.length > 64) throw new Error('bin code must contain 1 to 64 characters');
		if (!barcode || barcode.length > 128) throw new Error('bin barcode must contain 1 to 128 characters');
		if (!TYPES.includes(input.binType)) throw new Error('bin type is invalid');
		if ((input.aisle ?? '').length > 10) throw new Error('aisle cannot exceed 10 characters');

		validateNonNegativeInteger(input.rowNumber, 'rowNumber');
		validateNonNegativeInteger(input.levelNumber, 'levelNumber');
		validateNonNegativeInteger(input.positionNumber, 'positionNumber');

		const pickSequence = input.pickSequence ?? 0;
		const putawaySequence = input.putawaySequence ?? 0;
		validateNonNegativeInteger(pickSequence, 'pickSequence');
		validateNonNegativeInteger(putawaySequence, 'putawaySequence');
		validateCapacity(input.maxWeightLbs, 'maxWeightLbs');
		validateCapacity(input.maxVolumeCuft, 'maxVolumeCuft');

		return this.repository.createBin({
			...input,
			code,
			barcode,
			aisle: input.aisle?.trim() || null,
			pickSequence,
			putawaySequence,
			maxWeightLbs: input.maxWeightLbs ?? null,
			maxVolumeCuft: input.maxVolumeCuft ?? null
		});
	}
}
