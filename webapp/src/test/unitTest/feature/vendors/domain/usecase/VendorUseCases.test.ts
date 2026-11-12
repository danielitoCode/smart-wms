import { describe, expect, it, vi } from 'vitest';
import { GetAllVendorsUseCase } from '../../../../../../core/feature/vendors/domain/usecase/GetAllVendorsUseCase';
import { GetVendorByIdUseCase } from '../../../../../../core/feature/vendors/domain/usecase/GetVendorByIdUseCase';
import { SaveNewVendorUseCase } from '../../../../../../core/feature/vendors/domain/usecase/SaveNewVendorUseCase';
import { ModifyVendorUseCase } from '../../../../../../core/feature/vendors/domain/usecase/ModifyVendorUseCase';
import { DeleteVendorUseCase } from '../../../../../../core/feature/vendors/domain/usecase/DeleteVendorUseCase';
import type { VendorRepository } from '../../../../../../core/feature/vendors/domain/repository/VendorRepository';

const id = 'a8098c1a-f86e-4e7a-9b7d-2a2d5c9d1f10';
function repository(): VendorRepository {
	return { list: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() };
}

describe('Vendor use cases', () => {
	it('applies default pagination and active filter', async () => {
		const repo = repository();
		await new GetAllVendorsUseCase(repo).execute({ search: '  Acme  ' });
		expect(repo.list).toHaveBeenCalledWith({ search: 'Acme', filter: 'active', page: 1, perPage: 50 });
	});
	it('rejects invalid pagination before repository access', async () => {
		const repo = repository();
		expect(() => new GetAllVendorsUseCase(repo).execute({ page: 0 })).toThrow(/page/);
		expect(repo.list).not.toHaveBeenCalled();
	});
	it('validates UUIDs for get and delete', async () => {
		const repo = repository();
		expect(() => new GetVendorByIdUseCase(repo).execute('42')).toThrow(/UUID/);
		await expect(new DeleteVendorUseCase(repo).execute(id)).resolves.toBeUndefined();
		expect(repo.delete).toHaveBeenCalledWith(id);
	});
	it('normalizes and validates create payload', async () => {
		const repo = repository();
		await new SaveNewVendorUseCase(repo).execute({ vendorName: ' Acme ', contactName: ' Buyer ' });
		expect(repo.create).toHaveBeenCalledWith({ vendorName: 'Acme', contactName: 'Buyer' });
		expect(() => new SaveNewVendorUseCase(repo).execute({ vendorName: '  ' })).toThrow(/obligatorio/);
	});
	it('rejects empty updates and validates the UUID', async () => {
		const repo = repository();
		expect(() => new ModifyVendorUseCase(repo).execute('bad-id', { phone: '1' })).toThrow(/UUID/);
		expect(() => new ModifyVendorUseCase(repo).execute(id, {})).toThrow(/campo/);
		expect(repo.update).not.toHaveBeenCalled();
	});
	it('preserves explicit nulls to clear nullable fields', async () => {
		const repo = repository();
		await new ModifyVendorUseCase(repo).execute(id, { billingAddress: null, email: null });
		expect(repo.update).toHaveBeenCalledWith(id, { billingAddress: null, email: null });
	});
});
