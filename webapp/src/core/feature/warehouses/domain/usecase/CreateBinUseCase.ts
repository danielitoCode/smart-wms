import type { Bin, BinType, CreateBinInput } from '../entity/Warehouse';
import type { WarehouseManagementRepository } from '../repository/WarehouseManagementRepository';
const TYPES: BinType[] = ['Staging', 'PickableStaging', 'Pickable'];
function validateOptionalNonNegative(value: number | null | undefined, name: string) {
	if (value != null && (!Number.isInteger(value) || value < 0)) throw new Error(name + ' must be a non-negative integer');
}
export class CreateBinUseCase {
	constructor(private readonly repository: WarehouseManagementRepository) {}
	async execute(input: CreateBinInput): Promise<Bin> {
		const code = input.code?.trim() ?? '', barcode = input.barcode?.trim() ?? '';
		if (!Number.isInteger(input.warehouseId) || input.warehouseId <= 0) throw new Error('warehouseId must be a positive integer');
		if (!Number.isInteger(input.zoneId) || input.zoneId <= 0) throw new Error('zoneId must be a positive integer');
		if (!code || code.length > 64) throw new Error('bin code must contain 1 to 64 characters');
		if (!barcode || barcode.length > 128) throw new Error('bin barcode must contain 1 to 128 characters');
		if (!TYPES.includes(input.binType)) throw new Error('bin type is invalid');
		if ((input.aisle ?? '').length > 32) throw new Error('aisle cannot exceed 32 characters');
		validateOptionalNonNegative(input.rowNumber, 'rowNumber');
		validateOptionalNonNegative(input.levelNumber, 'levelNumber');
		validateOptionalNonNegative(input.positionNumber, 'positionNumber');
		const pickSequence = input.pickSequence ?? 0, putawaySequence = input.putawaySequence ?? 0;
		validateOptionalNonNegative(pickSequence, 'pickSequence');
		validateOptionalNonNegative(putawaySequence, 'putawaySequence');
		return this.repository.createBin({ ...input, code, barcode, aisle: input.aisle?.trim() || null, pickSequence, putawaySequence });
	}
}
