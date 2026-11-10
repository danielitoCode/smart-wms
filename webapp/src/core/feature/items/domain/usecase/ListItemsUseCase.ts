import type { Item } from '../entity/Item';
import type { ItemRepository } from '../repository/ItemRepository';

export type ListItemsInput = {
	category?: string;
	active?: boolean;
	q?: string;
	page?: number;
};

export class ListItemsUseCase {
	constructor(private readonly repository: ItemRepository) {}

	execute(input: ListItemsInput = {}): Promise<Item[]> {
		if (input.page != null && (!Number.isInteger(input.page) || input.page < 1)) {
			throw new Error('page must be an integer >= 1 when provided');
		}
		return this.repository.list({
			category: input.category?.trim() || undefined,
			active: input.active,
			q: input.q?.trim() || undefined,
			page: input.page
		});
	}
}
