import type { Item, ItemWriteInput } from '../entity/Item';
import type { ItemRepository } from '../repository/ItemRepository';
import { validateItemWrite } from '../validation/ItemValidation';

export class UpdateItemUseCase {
	constructor(private readonly repository: ItemRepository) {}

	execute(id: number, input: Partial<ItemWriteInput>): Promise<Item> {
		if (!Number.isInteger(id) || id < 1) throw new Error('item id must be a positive integer');
		if (Object.keys(input).length === 0) throw new Error('No fields to update');
		validateItemWrite(
			{
				sku: input.sku ?? '',
				itemName: input.itemName ?? '',
				...input
			},
			true
		);
		const body: Partial<ItemWriteInput> = { ...input };
		if (body.sku != null) body.sku = body.sku.trim();
		if (body.itemName != null) body.itemName = body.itemName.trim();
		if (body.description != null) body.description = body.description.trim() || null;
		if (body.upc != null) body.upc = body.upc.trim() || null;
		if (body.mpn != null) body.mpn = body.mpn.trim() || null;
		if (body.category != null) body.category = body.category.trim() || null;
		return this.repository.update(id, body);
	}
}
