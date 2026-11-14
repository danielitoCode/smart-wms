import type { ItemRepository } from '../repository/ItemRepository';

export class ArchiveItemUseCase {
	constructor(private readonly repository: ItemRepository) {}

	execute(id: number): Promise<{ message: string; active: boolean }> {
		if (!Number.isInteger(id) || id < 1) throw new Error('item id must be a positive integer');
		return this.repository.archive(id);
	}
}
