import type { Item, ItemDetail, ItemListPage, ItemListQuery, ItemWriteInput } from '../entity/Item';

export interface ItemRepository {
	/** GET /api/admin/items — paginated */
	listPage(query?: ItemListQuery): Promise<ItemListPage>;

	/** GET /api/admin/items/{id} — { item, inventory, preferred_bins } */
	getDetail(id: number): Promise<ItemDetail>;

	/** POST /api/admin/items */
	create(input: ItemWriteInput): Promise<Item>;

	/** PUT /api/admin/items/{id} */
	update(id: number, input: Partial<ItemWriteInput>): Promise<Item>;

	/** POST /api/admin/items/{id}/archive — toggle is_active */
	archive(id: number): Promise<{ message: string; active: boolean }>;

	/** DELETE /api/admin/items/{id} */
	delete(id: number): Promise<void>;

	/** GET /api/lookup/item/search?q= — operational search */
	search(query: string): Promise<Item[]>;

	/** GET /api/lookup/item/{barcode} */
	lookupByBarcode(barcode: string): Promise<Item>;
}
