import { describe, expect, it, vi } from 'vitest';
import type { ApiTokensRepository } from '#core/feature/api-tokens/domain/repository/ApiTokensRepository';
import {
	CreateApiTokenUseCase,
	RotateApiTokenUseCase,
	RevokeApiTokenUseCase,
	DeleteApiTokenUseCase
} from '#core/feature/api-tokens/domain/usecase/ApiTokensUseCases';

const baseInput = {
	name: 'integration-token',
	warehouseIds: [1],
	eventTypes: ['receipt.completed'],
	endpoints: ['events.poll'],
	sourceSystem: null,
	inboundResources: [],
	mappingOverride: false
};

function repository(): ApiTokensRepository {
	return {
		list: vi.fn(async () => []),
		scopeCatalog: vi.fn(async () => ({ eventTypes: [], endpoints: [], inboundResources: [], sourceSystems: [] })),
		warehouses: vi.fn(async () => []),
		create: vi.fn(async () => ({ token: {} as never, plaintext: 'one-time-secret' })),
		rotate: vi.fn(async () => ({ token: {} as never, plaintext: 'rotated-secret' })),
		revoke: vi.fn(async () => undefined),
		remove: vi.fn(async () => undefined)
	};
}

describe('API token domain use cases', () => {
	it('rejects an unknown direction and half-configured inbound scopes before persistence', async () => {
		const repo = repository();
		const create = new CreateApiTokenUseCase(repo);
		await expect(create.execute({ ...baseInput, endpoints: [] })).rejects.toThrow('al menos un endpoint');
		await expect(create.execute({ ...baseInput, sourceSystem: 'fabric', inboundResources: [] })).rejects.toThrow('configurarse juntos');
		expect(repo.create).not.toHaveBeenCalled();
	});

	it('rejects invalid warehouse IDs and mapping override without inbound scope', async () => {
		const repo = repository();
		const create = new CreateApiTokenUseCase(repo);
		await expect(create.execute({ ...baseInput, warehouseIds: [0] })).rejects.toThrow('identificadores positivos');
		await expect(create.execute({ ...baseInput, mappingOverride: true })).rejects.toThrow('solo se aplica');
		expect(repo.create).not.toHaveBeenCalled();
	});

	it('accepts outbound and inbound-only configurations and normalizes name', async () => {
		const repo = repository();
		const create = new CreateApiTokenUseCase(repo);
		await create.execute({ ...baseInput, name: '  outbound  ' });
		expect(repo.create).toHaveBeenCalledWith({ ...baseInput, name: 'outbound' });
		await create.execute({
			...baseInput, name: 'inbound', endpoints: [], sourceSystem: 'fabric',
			inboundResources: ['sales_orders']
		});
		expect(repo.create).toHaveBeenCalledTimes(2);
	});

	it('validates identifiers for rotate, revoke and delete', async () => {
		const repo = repository();
		await expect(new RotateApiTokenUseCase(repo).execute(0)).rejects.toThrow('Token inválido');
		await expect(new RevokeApiTokenUseCase(repo).execute(-1)).rejects.toThrow('Token inválido');
		await expect(new DeleteApiTokenUseCase(repo).execute(Number.NaN)).rejects.toThrow('Token inválido');
		expect(repo.rotate).not.toHaveBeenCalled();
		expect(repo.revoke).not.toHaveBeenCalled();
		expect(repo.remove).not.toHaveBeenCalled();
	});
});
