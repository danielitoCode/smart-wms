import type { ApiTokensRepository } from '../repository/ApiTokensRepository';
import type { ApiTokenCreateInput } from '../entity/ApiToken';

function assertTokenId(tokenId: number) {
	if (!Number.isSafeInteger(tokenId) || tokenId <= 0) throw new Error('Token inválido');
}

export class ListApiTokensUseCase {
	constructor(private readonly repository: ApiTokensRepository) {}
	execute() { return this.repository.list(); }
}

export class CreateApiTokenUseCase {
	constructor(private readonly repository: ApiTokensRepository) {}
	execute(input: ApiTokenCreateInput) {
		const name = input.name.trim();
		if (!name) throw new Error('El nombre del token es obligatorio');
		if (name.length > 128) throw new Error('El nombre no puede superar 128 caracteres');
		if (input.warehouseIds.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
			throw new Error('Los almacenes deben ser identificadores positivos');
		}
		const hasOutbound = input.endpoints.length > 0;
		const hasSource = Boolean(input.sourceSystem?.trim());
		const hasInboundResources = input.inboundResources.length > 0;
		if (!hasOutbound && !(hasSource && hasInboundResources)) {
			throw new Error('Configura al menos un endpoint saliente o un origen con recursos entrantes');
		}
		if (hasSource !== hasInboundResources) {
			throw new Error('El origen y los recursos entrantes deben configurarse juntos');
		}
		if (input.mappingOverride && !hasInboundResources) {
			throw new Error('La capacidad de sobrescritura solo se aplica a tokens entrantes');
		}
		if (input.expiresAt && !Number.isFinite(Date.parse(input.expiresAt))) {
			throw new Error('La fecha de expiración no es válida');
		}
		return this.repository.create({ ...input, name });
	}
}

export class RotateApiTokenUseCase {
	constructor(private readonly repository: ApiTokensRepository) {}
	execute(tokenId: number) { assertTokenId(tokenId); return this.repository.rotate(tokenId); }
}

export class RevokeApiTokenUseCase {
	constructor(private readonly repository: ApiTokensRepository) {}
	execute(tokenId: number) { assertTokenId(tokenId); return this.repository.revoke(tokenId); }
}

export class DeleteApiTokenUseCase {
	constructor(private readonly repository: ApiTokensRepository) {}
	execute(tokenId: number) { assertTokenId(tokenId); return this.repository.remove(tokenId); }
}

export class GetScopeCatalogUseCase {
	constructor(private readonly repository: ApiTokensRepository) {}
	execute() { return this.repository.scopeCatalog(); }
}

export class GetTokenWarehousesUseCase {
	constructor(private readonly repository: ApiTokensRepository) {}
	execute() { return this.repository.warehouses(); }
}
