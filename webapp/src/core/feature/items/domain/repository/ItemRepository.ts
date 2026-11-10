import type { Item } from '../entity/Item';

export interface ItemRepository {
	/** GET /api/admin/items */
	list(params?: {
		category?: string;
		active?: boolean;
		q?: string;
		page?: number;
	}): Promise<Item[]>;

	/** GET /api/admin/items/{id} */
	getById(id: number): Promise<Item>;

	/** GET /api/lookup/item/search?q= */
	search(query: string): Promise<Item[]>;

	/** GET /api/lookup/item/{barcode} */
	lookupByBarcode(barcode: string): Promise<Item>;
}
