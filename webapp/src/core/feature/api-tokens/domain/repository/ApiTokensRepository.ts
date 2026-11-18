import type {
	ApiToken,
	ApiTokenCreateInput,
	ApiTokenIssueResult,
	ApiTokenScopeCatalog
} from '../entity/ApiToken';

export interface ApiTokensRepository {
	list(): Promise<ApiToken[]>;
	scopeCatalog(): Promise<ApiTokenScopeCatalog>;
	create(input: ApiTokenCreateInput): Promise<ApiTokenIssueResult>;
	rotate(tokenId: number): Promise<ApiTokenIssueResult>;
	revoke(tokenId: number): Promise<void>;
	remove(tokenId: number): Promise<void>;
}
