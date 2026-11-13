import type { ApiToken, ApiTokenCreateInput, ApiTokenIssueResult } from '../entity/ApiToken';

export interface ApiTokensRepository {
	list(): Promise<ApiToken[]>;
	create(input: ApiTokenCreateInput): Promise<ApiTokenIssueResult>;
	rotate(tokenId: number): Promise<ApiTokenIssueResult>;
	revoke(tokenId: number): Promise<void>;
	remove(tokenId: number): Promise<void>;
	scopeCatalog(): Promise<string[]>;
}
