import { beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
	list: { execute: vi.fn() }, scopeCatalog: { execute: vi.fn() },
	warehouses: { execute: vi.fn() }, create: { execute: vi.fn() },
	rotate: { execute: vi.fn() }, revoke: { execute: vi.fn() }, remove: { execute: vi.fn() }
}));

vi.mock('../../../../../core/feature/api-tokens/di/apiTokens.dependencies', () => ({
	createApiTokensDependencies: () => deps
}));

import { createApiTokensState } from '../../../../../core/feature/api-tokens/ui/state/apiTokensState.svelte';

describe('API tokens presentation state', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		deps.list.execute.mockResolvedValue([]);
		deps.scopeCatalog.execute.mockResolvedValue({
			eventTypes: [], endpoints: ['events.poll'], inboundResources: [],
			sourceSystems: []
		});
		deps.warehouses.execute.mockResolvedValue([{ id: 2, code: 'WH-2', name: 'Main' }]);
		deps.create.execute.mockResolvedValue({
			token: { tokenId: 12, name: 'new-token', status: 'active' },
			plaintext: 'secret-only-once'
		});
		deps.rotate.execute.mockResolvedValue({
			token: { tokenId: 12, name: 'new-token', status: 'active' },
			plaintext: 'rotated-secret'
		});
	});

	it('keeps warehouse catalog optional when user lacks the separate warehouses grant', async () => {
		deps.warehouses.execute.mockRejectedValueOnce(new Error('403'));
		const state = createApiTokensState();
		await state.load();
		expect(state.rows).toEqual([]);
		expect(state.catalog.endpoints).toEqual(['events.poll']);
		expect(state.warehouses).toEqual([]);
		expect(state.error).toBeNull();
	});

	it('exposes create/rotate secret separately and never mixes it into listed rows', async () => {
		const state = createApiTokensState();
		await state.load();
		expect(await state.create({
			name: 'new-token', warehouseIds: [], eventTypes: [], endpoints: ['events.poll'],
			sourceSystem: null, inboundResources: [], mappingOverride: false
		})).toBe(true);
		expect(state.plaintext).toBe('secret-only-once');
		expect(JSON.stringify(state.rows)).not.toContain('secret-only-once');
		state.clearPlaintext();
		expect(state.plaintext).toBeNull();

		expect(await state.rotate(12)).toBe(true);
		expect(state.plaintext).toBe('rotated-secret');
		expect(JSON.stringify(state.rows)).not.toContain('rotated-secret');
	});

	it('does not swallow revoke or delete failures', async () => {
		const state = createApiTokensState();
		deps.revoke.execute.mockRejectedValueOnce(new Error('revoked denied'));
		expect(await state.revoke(12)).toBe(false);
		expect(state.error).toContain('revoked denied');
		deps.remove.execute.mockRejectedValueOnce(new Error('delete denied'));
		expect(await state.remove(12)).toBe(false);
		expect(state.error).toContain('delete denied');
	});
});
