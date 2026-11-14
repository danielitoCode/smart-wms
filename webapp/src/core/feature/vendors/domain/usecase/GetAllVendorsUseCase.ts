import type { VendorFilter, VendorListQuery, VendorPage } from '../entity/Vendor';
import type { VendorRepository } from '../repository/VendorRepository';

const FILTERS: readonly VendorFilter[] = ['active', 'archived', 'all'];

export class GetAllVendorsUseCase {
	constructor(private readonly repository: VendorRepository) {}

	execute(query: VendorListQuery = {}): Promise<VendorPage> {
		const page = query.page ?? 1;
		const perPage = query.perPage ?? 50;
		const filter = query.filter ?? 'active';
		if (!Number.isInteger(page) || page < 1) throw new Error('page must be an integer >= 1');
		if (!Number.isInteger(perPage) || perPage < 1 || perPage > 1000) {
			throw new Error('perPage must be an integer between 1 and 1000');
		}
		if (!FILTERS.includes(filter)) throw new Error('filter must be active, archived or all');
		const search = query.search?.trim();
		return this.repository.list({ search: search || undefined, filter, page, perPage });
	}
}
