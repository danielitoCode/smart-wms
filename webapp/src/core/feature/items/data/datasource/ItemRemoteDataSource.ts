import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type { ItemDto, ItemListResponseDto } from '../dto/ItemDto';

function asItemList(body: ItemDto[] | ItemListResponseDto | ItemDto): ItemDto[] {
	if (Array.isArray(body)) return body;
	if (body && typeof body === 'object') {
		const record = body as ItemListResponseDto & ItemDto;
		if (Array.isArray(record.items)) return record.items;
		if (Array.isArray(record.data)) return record.data;
		if (Array.isArray(record.results)) return record.results;
		if ('sku' in record) return [record as ItemDto];
	}
	return [];
}

export class ItemRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	async list(params?: {
		category?: string;
		active?: boolean;
		q?: string;
		page?: number;
	}): Promise<ItemDto[]> {
		const query = new URLSearchParams();
		if (params?.category) query.set('category', params.category);
		if (params?.active != null) query.set('active', String(params.active));
		if (params?.q) query.set('q', params.q);
		if (params?.page != null) query.set('page', String(params.page));
		const qs = query.toString();
		const body = await this.api.get<ItemDto[] | ItemListResponseDto>(
			`/api/admin/items${qs ? `?${qs}` : ''}`
		);
		return asItemList(body);
	}

	async getById(id: number): Promise<ItemDto> {
		return this.api.get<ItemDto>(`/api/admin/items/${id}`);
	}

	async search(query: string): Promise<ItemDto[]> {
		const body = await this.api.get<ItemDto[] | ItemListResponseDto>(
			`/api/lookup/item/search?q=${encodeURIComponent(query)}`
		);
		return asItemList(body);
	}

	async lookupByBarcode(barcode: string): Promise<ItemDto> {
		return this.api.get<ItemDto>(`/api/lookup/item/${encodeURIComponent(barcode)}`);
	}
}
