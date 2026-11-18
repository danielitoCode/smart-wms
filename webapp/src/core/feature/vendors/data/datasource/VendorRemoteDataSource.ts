import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type { VendorDto, VendorListDto, VendorMutationDto } from '../dto/VendorDto';
import type { VendorListQuery } from '../../domain/entity/Vendor';

export class VendorRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	async list(query: VendorListQuery = {}): Promise<VendorListDto> {
		const params = new URLSearchParams({
			page: String(query.page ?? 1),
			per_page: String(query.perPage ?? 50)
		});
		if (query.search) params.set('q', query.search);
		if (query.filter === 'active') params.set('active', 'true');
		else if (query.filter === 'archived') params.set('active', 'false');
		return this.api.get<VendorListDto>('/api/admin/vendors?' + params.toString());
	}

	async getById(id: string): Promise<VendorDto> {
		const response = await this.api.get<{ vendor: VendorDto }>('/api/admin/vendors/' + encodeURIComponent(id));
		return response.vendor;
	}

	async create(input: VendorMutationDto): Promise<VendorDto> {
		const response = await this.api.post<{ vendor: VendorDto }>('/api/admin/vendors', input);
		return response.vendor;
	}

	async update(id: string, input: VendorMutationDto): Promise<VendorDto> {
		const response = await this.api.put<{ vendor: VendorDto }>('/api/admin/vendors/' + encodeURIComponent(id), input);
		return response.vendor;
	}

	async delete(id: string): Promise<void> {
		const response = await this.api.delete<{ deleted: boolean }>('/api/admin/vendors/' + encodeURIComponent(id));
		if (response.deleted !== true) throw new Error('The vendors API did not confirm deletion');
	}
}
