import { describe, expect, it, vi } from 'vitest';
import { createVendorsState } from '../../../../../core/feature/vendors/ui/state/vendorsState.svelte';
import { ApiError } from '../../../../../core/infrastructure/errors/ApiError';
import type { Vendor } from '../../../../../core/feature/vendors/domain/entity/Vendor';
import type { VendorDependencies } from '../../../../../core/feature/vendors/di/vendors.dependencies';

const canonicalId = 'a8098c1a-f86e-4e7a-9b7d-2a2d5c9d1f10';
const vendor: Vendor = {
	canonicalId, externalId: 'c5e3d40a-68dd-4f16-8a70-2ac3f7c12f80',
	vendorName: 'Acme', contactName: 'Buyer', email: 'buyer@acme.test', phone: '555',
	billingAddress: 'Street 1', remitToAddress: 'Street 2', taxId: 'TAX', paymentTerms: 'Net 30',
	isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z'
};
function dependencies(): VendorDependencies {
	return {
		list: { execute: vi.fn().mockResolvedValue({ items: [vendor], total: 101, page: 1, perPage: 50, pages: 3 }) },
		get: { execute: vi.fn().mockResolvedValue(vendor) },
		create: { execute: vi.fn().mockResolvedValue(vendor) },
		update: { execute: vi.fn().mockResolvedValue(vendor) },
		remove: { execute: vi.fn().mockResolvedValue(undefined) }
	} as unknown as VendorDependencies;
}

describe('vendors UI state', () => {
	it('loads active vendors and exposes server pagination', async () => {
		const deps = dependencies();
		const state = createVendorsState(deps);
		await state.load();
		expect(deps.list.execute).toHaveBeenCalledWith({ search: '', filter: 'active', page: 1, perPage: 50 });
		expect(state.vendors).toEqual([vendor]);
		expect(state.pagination).toMatchObject({ total: 101, page: 1, pages: 3 });
	});

	it('propagates search, status filter and page into the list use case', async () => {
		const deps = dependencies();
		const state = createVendorsState(deps);
		state.setSearch('Acme');
		state.setFilter('archived');
		state.setPage(2);
		await state.load();
		expect(deps.list.execute).toHaveBeenCalledWith({ search: 'Acme', filter: 'archived', page: 2, perPage: 50 });
		state.setFilter('all');
		expect(state.page).toBe(1);
		await state.load();
		expect(deps.list.execute).toHaveBeenLastCalledWith({ search: 'Acme', filter: 'all', page: 1, perPage: 50 });
	});

	it('ignores an older list response after a newer request completes', async () => {
		const deps = dependencies();
		let resolveOld!: (value: unknown) => void;
		(deps.list.execute as ReturnType<typeof vi.fn>)
			.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
			.mockResolvedValueOnce({ items: [], total: 0, page: 1, perPage: 50, pages: 1 });
		const state = createVendorsState(deps);
		const oldRequest = state.load();
		state.setSearch('new');
		const newRequest = state.load();
		await newRequest;
		resolveOld({ items: [vendor], total: 1, page: 1, perPage: 50, pages: 1 });
		await oldRequest;
		expect(state.vendors).toEqual([]);
	});

	it('moves back to the last valid page when a mutation shrinks the result set', async () => {
		const deps = dependencies();
		(deps.list.execute as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce({ items: [], total: 51, page: 3, perPage: 50, pages: 2 })
			.mockResolvedValueOnce({ items: [vendor], total: 51, page: 2, perPage: 50, pages: 2 });
		const state = createVendorsState(deps);
		state.setPage(3);
		await state.load();
		expect(deps.list.execute).toHaveBeenNthCalledWith(1, { search: '', filter: 'active', page: 3, perPage: 50 });
		expect(deps.list.execute).toHaveBeenNthCalledWith(2, { search: '', filter: 'active', page: 2, perPage: 50 });
		expect(state.page).toBe(2);
		expect(state.pagination.page).toBe(2);
	});
	it('keeps vendors with duplicate display names distinct by canonical_id', async () => {
		const deps = dependencies();
		(deps.list.execute as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			items: [vendor, { ...vendor, canonicalId: 'b8098c1a-f86e-4e7a-9b7d-2a2d5c9d1f10', externalId: 'EXT-2' }],
			total: 2, page: 1, perPage: 50, pages: 1
		});
		const state = createVendorsState(deps);
		await state.load();
		expect(state.vendors).toHaveLength(2);
		expect(state.vendors.map(item => item.canonicalId)).toEqual([
			canonicalId, 'b8098c1a-f86e-4e7a-9b7d-2a2d5c9d1f10'
		]);
	});
	it('loads and closes a vendor detail by canonical_id', async () => {
		const deps = dependencies();
		const state = createVendorsState(deps);
		await state.loadDetail(canonicalId);
		expect(deps.get.execute).toHaveBeenCalledWith(canonicalId);
		expect(state.detail).toEqual(vendor);
		state.closeDetail();
		expect(state.detail).toBeNull();
	});

	it('deactivates through PUT update and hard deletes through delete use case', async () => {
		const deps = dependencies();
		const state = createVendorsState(deps);
		await expect(state.deactivate(canonicalId)).resolves.toBe(true);
		expect(deps.update.execute).toHaveBeenCalledWith(canonicalId, { isActive: false });
		await expect(state.remove(canonicalId)).resolves.toBe(true);
		expect(deps.remove.execute).toHaveBeenCalledWith(canonicalId);
	});

	it('keeps errors visible when a create conflicts or a vendor cannot be found', async () => {
		const deps = dependencies();
		(deps.create.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new ApiError(409, 'Duplicate vendor', 'conflict'));
		(deps.get.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new ApiError(404, 'Vendor not found', 'not_found'));
		const state = createVendorsState(deps);
		expect(await state.create({ vendorName: 'Acme' })).toBe(false);
		expect(state.error).toContain('Duplicate vendor');
		await state.loadDetail(canonicalId);
		expect(state.detailError).toContain('Vendor not found');
	});
});
