import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type { CustomerSearchQuery } from '../../domain/entity/Customer';
import type { GlobalSearchResponseDto } from '../dto/CustomerSearchDto';

export class CustomerRemoteDataSource {
  constructor(private readonly api: ApiClient) {}

  async search(query: CustomerSearchQuery): Promise<GlobalSearchResponseDto> {
    const params = new URLSearchParams({ q: query.search });
    return this.api.get<GlobalSearchResponseDto>(`/api/admin/search?${params.toString()}`);
  }
}
