import type { Bin, BinType, UpdateBinInput } from '../entity/Warehouse';
import type { WarehouseManagementRepository } from '../repository/WarehouseManagementRepository';
const TYPES: BinType[] = ['Staging', 'PickableStaging', 'Pickable'];
function validateOptionalNonNegative(value: number | null | undefined, name: string) {
	if (value != null && (!Number.isInteger(value) || value < 0)) throw new Error(name + ' must be a non-negative integer');
}
export class UpdateBinUseCase {
	constructor(private readonly repository: WarehouseManagementRepository) {}
	async execute(input: UpdateBinInput): Promise<Bin> {
		if (!Number.isInteger(input.id) || input.id <= 0) throw new Error('bin id must be a positive integer');
		const update: UpdateBinInput = { id: input.id };
		if (input.zoneId !== undefined) {
			if (!Number.isInteger(input.zoneId) || input.zoneId <= 0) throw new Error('zoneId must be a positive integer');
			update.zoneId = input.zoneId;
		}
		if (input.code !== undefined) {
			const value = input.code.trim();
			if (!value || value.length > 50) throw new Error('bin code must contain 1 to 50 characters');
			update.code = value;
		}
		if (input.barcode !== undefined) {
			const value = input.barcode.trim();
			if (!value || value.length > 100) throw new Error('bin barcode must contain 1 to 100 characters');
			update.barcode = value;
		}
		if (input.binType !== undefined) {
			if (!TYPES.includes(input.binType)) throw new Error('bin type is invalid');
			update.binType = input.binType;
		}
		if (input.aisle !== undefined) {
			if (input.aisle !== null && input.aisle.trim().length > 10) throw new Error('aisle cannot exceed 10 characters');
			update.aisle = input.aisle?.trim() || null;
		}
		for (const [value, name] of [
			[input.rowNumber, 'rowNumber'], [input.levelNumber, 'levelNumber'],
			[input.positionNumber, 'positionNumber'], [input.pickSequence, 'pickSequence'],
			[input.putawaySequence, 'putawaySequence']
		] as const) validateOptionalNonNegative(value, name);
		if (input.rowNumber !== undefined) update.rowNumber = input.rowNumber;
		if (input.levelNumber !== undefined) update.levelNumber = input.levelNumber;
		if (input.positionNumber !== undefined) update.positionNumber = input.positionNumber;
		if (input.pickSequence !== undefined) update.pickSequence = input.pickSequence;
		if (input.putawaySequence !== undefined) update.putawaySequence = input.putawaySequence;
		if (input.active !== undefined) update.active = input.active;
		for (const [value, name] of [[input.maxWeightLbs, 'maxWeightLbs'], [input.maxVolumeCuft, 'maxVolumeCuft']] as const) {
			if (value !== undefined && value !== null && (!Number.isFinite(value) || value < 0 || value > 99999999.99 || Math.abs(value * 100 - Math.round(value * 100)) > 0.000001)) throw new Error(name + ' must be a non-negative number with at most two decimal places');
		}
		if (input.maxWeightLbs !== undefined) update.maxWeightLbs = input.maxWeightLbs;
		if (input.maxVolumeCuft !== undefined) update.maxVolumeCuft = input.maxVolumeCuft;
		if (Object.keys(update).length === 1) throw new Error('at least one bin field is required');
		return this.repository.updateBin(update);
	}
}
