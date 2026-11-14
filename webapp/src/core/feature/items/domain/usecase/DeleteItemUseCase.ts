import type { ItemRepository } from '../repository/ItemRepository';

export class DeleteItemUseCase {
	constructor(private readonly repository: ItemRepository) {}

	execute(id: number): Promise<void> {
		if (!Number.isInteger(id) || id < 1) throw new Error('item id must be a positive integer');
		return this.repository.delete(id);
	}
}
