import { describe, expect, it } from 'vitest';
import { AdjustmentApprovalPolicy } from '../../../../../../core/feature/inventory-adjustments/domain/policy/AdjustmentApprovalPolicy';

describe('Adjustment approval policy', () => {
	it('allows transitions only while the adjustment is pending', () => {
		expect(AdjustmentApprovalPolicy.canTransition('PENDING', 'approve')).toBe(true);
		expect(AdjustmentApprovalPolicy.canTransition('PENDING', 'reject')).toBe(true);
		expect(AdjustmentApprovalPolicy.canTransition('APPROVED', 'approve')).toBe(false);
		expect(AdjustmentApprovalPolicy.canTransition('REJECTED', 'reject')).toBe(false);
		expect(() => AdjustmentApprovalPolicy.assertTransition('APPROVED', 'reject')).toThrow(/ya fue revisado/);
	});

	it('requires a bounded rejection reason', () => {
		expect(AdjustmentApprovalPolicy.validateRejectionReason('  Conteo no verificable  ')).toBe('Conteo no verificable');
		expect(() => AdjustmentApprovalPolicy.validateRejectionReason('   ')).toThrow(/obligatorio/);
		expect(() => AdjustmentApprovalPolicy.validateRejectionReason('x'.repeat(501))).toThrow(/500/);
	});

	it('evaluates a tolerance only when an explicit value is supplied', () => {
		expect(AdjustmentApprovalPolicy.isWithinTolerance(10, 12, 2)).toBe(true);
		expect(AdjustmentApprovalPolicy.isWithinTolerance(10, 13, 2)).toBe(false);
		expect(() => AdjustmentApprovalPolicy.isWithinTolerance(10, 11, -1)).toThrow(/tolerancia/);
	});
});
