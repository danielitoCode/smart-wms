export type ApiToken = {
	tokenId: number;
	name: string;
	scopes: string[];
	eventTypes: string[];
	sourceSystem: string | null;
	inboundResources: string[];
	mappingOverride: boolean;
	rotationStatus: string;
	createdAt: string | null;
	rotatedAt: string | null;
	expiresAt: string | null;
	revokedAt: string | null;
	lastUsedAt: string | null;
};

export type ApiTokenCreateInput = {
	name: string;
	scopes: string[];
	eventTypes?: string[];
	sourceSystem?: string | null;
	inboundResources?: string[];
};

export type ApiTokenIssueResult = {
	token: ApiToken;
	plaintext: string | null;
};
