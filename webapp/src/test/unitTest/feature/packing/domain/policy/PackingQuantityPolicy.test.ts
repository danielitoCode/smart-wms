import { describe, expect, it } from 'vitest';
import { arePackingQuantitiesReconciled } from '../../../../../../core/feature/packing/domain/policy/PackingQuantityPolicy';
import type { PackingLine } from '../../../../../../core/feature/packing/domain/entity/Packing';

const line = (quantityPicked: number, quantityPacked: number): PackingLine => ({
	sku: 'SKU-1',
	quantityPicked,
	quantityPacked,
	packVerified: quantityPacked === quantityPicked
});

describe('arePackingQuantitiesReconciled', () => {
	it('requires a non-empty order and exact equality per line', () => {
		expect(arePackingQuantitiesReconciled([])).toBe(false);
		expect(arePackingQuantitiesReconciled([line(3, 3)])).toBe(true);
		expect(arePackingQuantitiesReconciled([line(3, 2)])).toBe(false);
		expect(arePackingQuantitiesReconciled([line(3, 4)])).toBe(false);
	});

	it('rejects negative and fractional quantities', () => {
		expect(arePackingQuantitiesReconciled([line(-1, -1)])).toBe(false);
		expect(arePackingQuantitiesReconciled([line(1.5, 1.5)])).toBe(false);
	});

	it('requires every line to reconcile', () => {
		expect(arePackingQuantitiesReconciled([line(2, 2), line(4, 3)])).toBe(false);
	});
});
