import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import type { ApiTokenDto, ApiTokenListResponseDto, ScopeCatalogDto } from '../dto/ApiTokenDto';

export class ApiTokensRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	list() {
		return this.api.get<ApiTokenListResponseDto>('/api/admin/tokens');
	}

	create(body: Record<string, unknown>) {
		return this.api.post<ApiTokenDto>('/api/admin/tokens', body);
	}

	rotate(tokenId: number) {
		return this.api.post<ApiTokenDto>(`/api/admin/tokens/${tokenId}/rotate`, {});
	}

	revoke(tokenId: number) {
		return this.api.post<void>(`/api/admin/tokens/${tokenId}/revoke`, {});
	}

	remove(tokenId: number) {
		return this.api.delete<void>(`/api/admin/tokens/${tokenId}`);
	}

	scopeCatalog() {
		return this.api.get<ScopeCatalogDto>('/api/admin/scope-catalog');
	}
}
