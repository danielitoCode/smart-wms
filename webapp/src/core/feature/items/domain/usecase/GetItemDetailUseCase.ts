import type { ItemDetail } from '../entity/Item';
import type { ItemRepository } from '../repository/ItemRepository';

export class GetItemDetailUseCase {
	constructor(private readonly repository: ItemRepository) {}

	execute(id: number): Promise<ItemDetail> {
		if (!Number.isInteger(id) || id < 1) throw new Error('item id must be a positive integer');
		return this.repository.getDetail(id);
	}
}
