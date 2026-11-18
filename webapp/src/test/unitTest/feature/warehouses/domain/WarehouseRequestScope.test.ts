import { afterEach, describe, expect, it } from 'vitest';
import {
	beginWarehouseScopedRequest,
	getWarehouseGeneration,
	notifyWarehouseChanged,
	resetWarehouseRequestScopeForTests
} from '../../../../../core/infrastructure/warehouse/WarehouseRequestScope';

describe('active warehouse request scope', () => {
	afterEach(() => resetWarehouseRequestScopeForTests());

	it('aborts pending work and invalidates responses when the active warehouse changes', () => {
		const request = beginWarehouseScopedRequest();
		const previousGeneration = request.generation;
		expect(request.signal.aborted).toBe(false);
		expect(request.isCurrent()).toBe(true);

		const nextGeneration = notifyWarehouseChanged();

		expect(nextGeneration).toBe(previousGeneration + 1);
		expect(getWarehouseGeneration()).toBe(nextGeneration);
		expect(request.signal.aborted).toBe(true);
		expect(request.isCurrent()).toBe(false);
	});
});
