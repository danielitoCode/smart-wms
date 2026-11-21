import type { PackingLine } from '../entity/Packing';

/**
 * Packing is complete only when every picked unit is accounted for exactly.
 * A greater packed quantity is also a reconciliation error, not completion.
 */
export function arePackingQuantitiesReconciled(lines: PackingLine[]): boolean {
	return lines.length > 0 && lines.every((line) =>
		Number.isInteger(line.quantityPicked) &&
		Number.isInteger(line.quantityPacked) &&
		line.quantityPicked >= 0 &&
		line.quantityPacked === line.quantityPicked
	);
}
