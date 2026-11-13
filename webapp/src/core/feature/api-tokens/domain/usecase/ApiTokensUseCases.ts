import type { ApiTokensRepository } from '../repository/ApiTokensRepository';
import type { ApiTokenCreateInput } from '../entity/ApiToken';

export class ListApiTokensUseCase {
	constructor(private readonly repository: ApiTokensRepository) {}
	execute() { return this.repository.list(); }
}

export class CreateApiTokenUseCase {
	constructor(private readonly repository: ApiTokensRepository) {}
	execute(input: ApiTokenCreateInput) {
		if (!input.name.trim()) throw new Error('El nombre del token es obligatorio');
		if (!input.scopes.length) throw new Error('Selecciona al menos un scope');
		return this.repository.create({ ...input, name: input.name.trim() });
	}
}

export class RotateApiTokenUseCase {
	constructor(private readonly repository: ApiTokensRepository) {}
	execute(tokenId: number) {
		if (tokenId <= 0) throw new Error('Token inválido');
		return this.repository.rotate(tokenId);
	}
}

export class RevokeApiTokenUseCase {
	constructor(private readonly repository: ApiTokensRepository) {}
	execute(tokenId: number) {
		if (tokenId <= 0) throw new Error('Token inválido');
		return this.repository.revoke(tokenId);
	}
}

export class DeleteApiTokenUseCase {
	constructor(private readonly repository: ApiTokensRepository) {}
	execute(tokenId: number) {
		if (tokenId <= 0) throw new Error('Token inválido');
		return this.repository.remove(tokenId);
	}
}

export class GetScopeCatalogUseCase {
	constructor(private readonly repository: ApiTokensRepository) {}
	execute() { return this.repository.scopeCatalog(); }
}
