import type { Item } from '../../domain/entity/Item';
import type { ItemDto } from '../dto/ItemDto';

export const ItemMapper = {
	toItem(dto: ItemDto): Item {
		const active =
			dto.active ??
			dto.is_active ??
			(dto.archived != null ? !dto.archived : true);

		return {
			id: dto.id ?? dto.item_id ?? 0,
			sku: dto.sku,
			name: dto.item_name ?? dto.name ?? '',
			upc: dto.upc ?? null,
			mpn: dto.mpn ?? null,
			category: dto.category ?? null,
			active
		};
	}
};
