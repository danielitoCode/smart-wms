import type { Item, ItemWriteInput } from '../entity/Item';
import type { ItemRepository } from '../repository/ItemRepository';
import { validateItemWrite } from '../validation/ItemValidation';

export class CreateItemUseCase {
	constructor(private readonly repository: ItemRepository) {}

	execute(input: ItemWriteInput): Promise<Item> {
		validateItemWrite(input, false);
		return this.repository.create({
			...input,
			sku: input.sku.trim(),
			itemName: input.itemName.trim(),
			description: input.description?.trim() || null,
			upc: input.upc?.trim() || null,
			mpn: input.mpn?.trim() || null,
			category: input.category?.trim() || null
		});
	}
}
