import type { InventoryPage, InventoryQuery } from '../entity/InventoryStock';
import type { InventoryRepository } from '../repository/InventoryRepository';

export type GetInventoryOverviewInput = InventoryQuery;

export class GetInventoryOverviewUseCase {
	constructor(private readonly repository: InventoryRepository) {}

	execute(input: GetInventoryOverviewInput = {}): Promise<InventoryPage> {
		validateQuery(input);
		const query = input.query?.trim();
		return this.repository.getOverview({
			...input,
			...(query ? { query } : { query: undefined })
		});
	}
}

export function validateQuery(input: InventoryQuery): void {
	for (const [name, value] of [
		['warehouseId', input.warehouseId],
		['itemId', input.itemId],
		['binId', input.binId]
	] as const) {
		if (value != null && (!Number.isInteger(value) || value <= 0)) {
			throw new Error(`${name} must be a positive integer when provided`);
		}
	}
	if (input.page != null && (!Number.isInteger(input.page) || input.page < 1)) {
		throw new Error('page must be an integer >= 1 when provided');
	}
	if (input.perPage != null && (!Number.isInteger(input.perPage) || input.perPage < 1 || input.perPage > 1000)) {
		throw new Error('perPage must be an integer between 1 and 1000');
	}
	if (input.query != null && typeof input.query !== 'string') {
		throw new Error('query must be a string when provided');
	}
}
