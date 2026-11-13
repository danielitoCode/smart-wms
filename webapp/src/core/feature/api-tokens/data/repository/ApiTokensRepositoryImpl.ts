import type { ApiTokensRepository } from '../../domain/repository/ApiTokensRepository';
import type { ApiToken, ApiTokenCreateInput, ApiTokenIssueResult } from '../../domain/entity/ApiToken';
import { ApiTokensRemoteDataSource } from '../datasource/ApiTokensRemoteDataSource';
import { ApiTokenMapper } from '../mapper/ApiTokenMapper';

export class ApiTokensRepositoryImpl implements ApiTokensRepository {
	constructor(private readonly remote: ApiTokensRemoteDataSource) {}

	async list(): Promise<ApiToken[]> {
		const response = await this.remote.list();
		return (response.tokens ?? []).map(ApiTokenMapper.toDomain);
	}

	async create(input: ApiTokenCreateInput): Promise<ApiTokenIssueResult> {
		const dto = await this.remote.create({
			name: input.name,
			scopes: input.scopes,
			event_types: input.eventTypes ?? [],
			source_system: input.sourceSystem ?? null,
			inbound_resources: input.inboundResources ?? []
		});
		return {
			token: ApiTokenMapper.toDomain(dto),
			plaintext: dto.plaintext ?? dto.token ?? null
		};
	}

	async rotate(tokenId: number): Promise<ApiTokenIssueResult> {
		const dto = await this.remote.rotate(tokenId);
		return {
			token: ApiTokenMapper.toDomain(dto),
			plaintext: dto.plaintext ?? dto.token ?? null
		};
	}

	async revoke(tokenId: number): Promise<void> {
		await this.remote.revoke(tokenId);
	}

	async remove(tokenId: number): Promise<void> {
		await this.remote.remove(tokenId);
	}

	async scopeCatalog(): Promise<string[]> {
		const dto = await this.remote.scopeCatalog();
		return dto.scopes ?? [];
	}
}
