import type { ItemListPage, ItemListQuery } from '../entity/Item';
import type { ItemRepository } from '../repository/ItemRepository';

export class ListItemsUseCase {
	constructor(private readonly repository: ItemRepository) {}

	execute(query: ItemListQuery = {}, options?: { signal?: AbortSignal }): Promise<ItemListPage> {
		const page = query.page ?? 1;
		const perPage = query.perPage ?? 50;
		if (!Number.isInteger(page) || page < 1) throw new Error('page must be an integer >= 1');
		if (!Number.isInteger(perPage) || perPage < 1 || perPage > 1000) {
			throw new Error('per_page must be 1..1000');
		}
		return this.repository.listPage({
			q: query.q?.trim() || undefined,
			filter: query.filter ?? 'active',
			category: query.category?.trim() || undefined,
			page,
			perPage
		}, options);
	}
}
