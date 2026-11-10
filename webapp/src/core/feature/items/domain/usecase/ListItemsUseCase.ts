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
		return this.repository.list(input);
	}
}
