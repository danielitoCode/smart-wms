import type { ApiClient } from '#core/infrastructure/api/ApiClient.ts';
import type {
	ItemArchiveResponseDto,
	ItemDetailResponseDto,
	ItemDto,
	ItemListResponseDto,
	ItemWriteBodyDto
} from '../dto/ItemDto';

function asItemList(body: ItemDto[] | { items?: ItemDto[]; data?: ItemDto[]; results?: ItemDto[] }): ItemDto[] {
	if (Array.isArray(body)) return body;
	if (body && typeof body === 'object') {
		if (Array.isArray(body.items)) return body.items;
		if (Array.isArray(body.data)) return body.data;
		if (Array.isArray(body.results)) return body.results;
	}
	return [];
}

export class ItemRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	listPage(params: {
		category?: string;
		active?: boolean;
		q?: string;
		page?: number;
		perPage?: number;
	}, options?: { signal?: AbortSignal }): Promise<ItemListResponseDto> {
		return this.api.get<ItemListResponseDto>('/api/admin/items', {
			query: {
				category: params.category,
				active: params.active === undefined ? undefined : params.active ? 'true' : 'false',
				q: params.q,
				page: params.page,
				per_page: params.perPage
			},
			signal: options?.signal
		});
	}

	getDetail(id: number): Promise<ItemDetailResponseDto | ItemDto> {
		return this.api.get<ItemDetailResponseDto | ItemDto>(`/api/admin/items/${id}`);
	}

	create(body: ItemWriteBodyDto): Promise<ItemDto> {
		return this.api.post<ItemDto>('/api/admin/items', body);
	}

	update(id: number, body: ItemWriteBodyDto): Promise<ItemDto> {
		return this.api.put<ItemDto>(`/api/admin/items/${id}`, body);
	}

	archive(id: number): Promise<ItemArchiveResponseDto> {
		return this.api.post<ItemArchiveResponseDto>(`/api/admin/items/${id}/archive`, {});
	}

	delete(id: number): Promise<void> {
		return this.api.delete<void>(`/api/admin/items/${id}`);
	}

	async search(query: string): Promise<ItemDto[]> {
		const body = await this.api.get<ItemDto[] | ItemListResponseDto>('/api/lookup/item/search', {
			query: { q: query }
		});
		return asItemList(body);
	}

	lookupByBarcode(barcode: string): Promise<ItemDto> {
		return this.api.get<ItemDto>(`/api/lookup/item/${encodeURIComponent(barcode)}`);
	}
}
