import type { VendorListQuery, VendorPage } from '../entity/Vendor';
import type { VendorRepository } from '../repository/VendorRepository';

export class GetAllVendorsUseCase {
	constructor(private readonly repository: VendorRepository) {}

	execute(query: VendorListQuery = {}): Promise<VendorPage> {
		const page = query.page ?? 1;
		const perPage = query.perPage ?? 50;
		if (!Number.isInteger(page) || page < 1) throw new Error('page must be an integer >= 1');
		if (!Number.isInteger(perPage) || perPage < 1 || perPage > 1000) {
			throw new Error('perPage must be an integer between 1 and 1000');
		}
		const search = query.search?.trim();
		return this.repository.list({
			search: search || undefined,
			filter: query.filter ?? 'active',
			page,
			perPage
		});
	}
}
