import type { Item } from '../entity/Item';
import type { ItemRepository } from '../repository/ItemRepository';

export class SearchItemsUseCase {
	constructor(private readonly repository: ItemRepository) {}

	execute(query: string): Promise<Item[]> {
		const q = query?.trim() ?? '';
		if (!q) {
			throw new Error('search query is required');
		}
		return this.repository.search(q);
	}
}
