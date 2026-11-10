import type { ItemRepository } from '../../domain/repository/ItemRepository';
import type { Item } from '../../domain/entity/Item';
import type { ItemRemoteDataSource } from '../datasource/ItemRemoteDataSource';
import { ItemMapper } from '../mapper/ItemMapper';

export class ItemRepositoryImpl implements ItemRepository {
	constructor(private readonly datasource: ItemRemoteDataSource) {}

	async list(params?: {
		category?: string;
		active?: boolean;
		q?: string;
		page?: number;
	}): Promise<Item[]> {
		const rows = await this.datasource.list(params);
		return rows.map(ItemMapper.toItem);
	}

	async getById(id: number): Promise<Item> {
		const row = await this.datasource.getById(id);
		return ItemMapper.toItem(row);
	}

	async search(query: string): Promise<Item[]> {
		const rows = await this.datasource.search(query);
		return rows.map(ItemMapper.toItem);
	}

	async lookupByBarcode(barcode: string): Promise<Item> {
		const row = await this.datasource.lookupByBarcode(barcode);
		return ItemMapper.toItem(row);
	}
}
