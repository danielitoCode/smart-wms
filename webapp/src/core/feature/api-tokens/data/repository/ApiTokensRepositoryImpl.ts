import type { ApiTokensRepository } from '../../domain/repository/ApiTokensRepository';
import type {
	ApiToken,
	ApiTokenCreateInput,
	ApiTokenIssueResult,
	ApiTokenScopeCatalog
} from '../../domain/entity/ApiToken';
import { ApiTokensRemoteDataSource } from '../datasource/ApiTokensRemoteDataSource';
import { ApiTokenMapper } from '../mapper/ApiTokenMapper';

export class ApiTokensRepositoryImpl implements ApiTokensRepository {
	constructor(private readonly remote: ApiTokensRemoteDataSource) {}

	async list(): Promise<ApiToken[]> {
		const response = await this.remote.list();
		return response.tokens.map(ApiTokenMapper.toDomain);
	}

	async create(input: ApiTokenCreateInput): Promise<ApiTokenIssueResult> {
		const dto = await this.remote.create({
			token_name: input.name,
			warehouse_ids: input.warehouseIds,
			event_types: input.eventTypes,
			endpoints: input.endpoints,
			expires_at: input.expiresAt ?? null,
			source_system: input.sourceSystem ?? null,
			inbound_resources: input.inboundResources,
			mapping_override: input.mappingOverride
		});
		if (!dto.token) throw new Error('El servidor no devolvió el secreto del token recién creado');
		return { token: ApiTokenMapper.toDomain(dto), plaintext: dto.token };
	}

	async rotate(tokenId: number): Promise<ApiTokenIssueResult> {
		const dto = await this.remote.rotate(tokenId);
		if (!dto.token) throw new Error('El servidor no devolvió el nuevo secreto del token');
		return { token: ApiTokenMapper.toDomain(dto), plaintext: dto.token };
	}

	async revoke(tokenId: number): Promise<void> {
		await this.remote.revoke(tokenId);
	}

	async remove(tokenId: number): Promise<void> {
		await this.remote.remove(tokenId);
	}

	async scopeCatalog(): Promise<ApiTokenScopeCatalog> {
		const dto = await this.remote.scopeCatalog();
		return {
			eventTypes: dto.event_types,
			endpoints: dto.endpoints,
			inboundResources: dto.inbound_resources,
			sourceSystems: dto.source_systems.map((item) => ({
				sourceSystem: item.source_system,
				kind: item.kind
			}))
		};
	}

	async warehouses() {
		const response = await this.remote.warehouses();
		return response.warehouses;
	}
}
