import type {
	ApiToken,
	ApiTokenCreateInput,
	ApiTokenIssueResult,
	ApiTokenScopeCatalog,
	WarehouseOption
} from '../entity/ApiToken';

export interface ApiTokensRepository {
	list(): Promise<ApiToken[]>;
	scopeCatalog(): Promise<ApiTokenScopeCatalog>;
	warehouses(): Promise<WarehouseOption[]>;
	create(input: ApiTokenCreateInput): Promise<ApiTokenIssueResult>;
	rotate(tokenId: number): Promise<ApiTokenIssueResult>;
	revoke(tokenId: number): Promise<void>;
	remove(tokenId: number): Promise<void>;
}
