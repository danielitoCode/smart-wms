import type { Item, ItemDetail, ItemListPage, ItemListQuery, ItemWriteInput } from '../../domain/entity/Item';
import type { ItemRepository } from '../../domain/repository/ItemRepository';
import type { ItemRemoteDataSource } from '../datasource/ItemRemoteDataSource';
import { ItemMapper } from '../mapper/ItemMapper';

export class ItemRepositoryImpl implements ItemRepository {
	constructor(private readonly datasource: ItemRemoteDataSource) {}

	async listPage(query: ItemListQuery = {}): Promise<ItemListPage> {
		const filter = query.filter ?? 'active';
		const active = filter === 'all' ? undefined : filter === 'active';
		const body = await this.datasource.listPage({
			category: query.category,
			active,
			q: query.q,
			page: query.page,
			perPage: query.perPage
		});
		return ItemMapper.toListPage(body);
	}

	async getDetail(id: number): Promise<ItemDetail> {
		const body = await this.datasource.getDetail(id);
		return ItemMapper.toDetail(body);
	}

	async create(input: ItemWriteInput): Promise<Item> {
		const row = await this.datasource.create(ItemMapper.toWriteBody(input));
		return ItemMapper.toItem(row);
	}

	async update(id: number, input: Partial<ItemWriteInput>): Promise<Item> {
		const row = await this.datasource.update(id, ItemMapper.toWriteBody(input));
		return ItemMapper.toItem(row);
	}

	async archive(id: number): Promise<{ message: string; active: boolean }> {
		const res = await this.datasource.archive(id);
		return { message: res.message, active: res.is_active };
	}

	async delete(id: number): Promise<void> {
		await this.datasource.delete(id);
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
