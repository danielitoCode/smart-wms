import { describe, it, expect, beforeEach } from 'vitest';
import {
	beginWarehouseScopedRequest,
	getWarehouseGeneration,
	notifyWarehouseChanged,
	resetWarehouseRequestScopeForTests
} from '../../../../core/infrastructure/warehouse/WarehouseRequestScope';

describe('WarehouseRequestScope', () => {
	beforeEach(() => resetWarehouseRequestScopeForTests());

	it('bumps generation and aborts prior scoped requests on warehouse change', () => {
		const first = beginWarehouseScopedRequest();
		expect(first.isCurrent()).toBe(true);
		expect(getWarehouseGeneration()).toBe(0);

		const nextGen = notifyWarehouseChanged();
		expect(nextGen).toBe(1);
		expect(first.isCurrent()).toBe(false);
		expect(first.signal.aborted).toBe(true);

		const second = beginWarehouseScopedRequest();
		expect(second.generation).toBe(1);
		expect(second.isCurrent()).toBe(true);
		second.release();
	});

	it('prevents stale completion after generation change', () => {
		const scoped = beginWarehouseScopedRequest();
		const genAtStart = scoped.generation;
		notifyWarehouseChanged();
		expect(scoped.generation).toBe(genAtStart);
		expect(scoped.isCurrent()).toBe(false);
	});
});
