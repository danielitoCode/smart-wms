import type { CreateVendor, UpdateVendor, Vendor, VendorId, VendorListQuery, VendorPage } from '../../domain/entity/Vendor';
import type { VendorRepository } from '../../domain/repository/VendorRepository';
import type { VendorRemoteDataSource } from '../datasource/VendorRemoteDataSource';
import { VendorMapper } from '../mapper/VendorMapper';

export class VendorRepositoryImpl implements VendorRepository {
	constructor(private readonly datasource: VendorRemoteDataSource) {}

	async list(query?: VendorListQuery): Promise<VendorPage> {
		return VendorMapper.toPage(await this.datasource.list(query));
	}
	async getById(id: VendorId): Promise<Vendor> {
		return VendorMapper.toDomain(await this.datasource.getById(id));
	}
	async create(input: CreateVendor): Promise<Vendor> {
		return VendorMapper.toDomain(await this.datasource.create(VendorMapper.toCreateDto(input)));
	}
	async update(id: VendorId, input: UpdateVendor): Promise<Vendor> {
		return VendorMapper.toDomain(await this.datasource.update(id, VendorMapper.toUpdateDto(input)));
	}
	async delete(id: VendorId): Promise<void> {
		await this.datasource.delete(id);
	}
}
