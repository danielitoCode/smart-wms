export type ApiTokenStatus = 'active' | 'revoked' | 'expired' | string;
export type RotationStatus = 'none' | 'recommended' | 'overdue' | string;

export type ApiToken = {
	tokenId: number;
	name: string;
	warehouseIds: number[];
	eventTypes: string[];
	endpoints: string[];
	connectorId: string | null;
	status: ApiTokenStatus;
	sourceSystem: string | null;
	inboundResources: string[];
	mappingOverride: boolean;
	mappingOverridesKeys: string[];
	rotationStatus: RotationStatus;
	createdAt: string | null;
	rotatedAt: string | null;
	expiresAt: string | null;
	revokedAt: string | null;
	lastUsedAt: string | null;
};

export type SourceSystemOption = { sourceSystem: string; kind: string };

export type ApiTokenScopeCatalog = {
	eventTypes: string[];
	endpoints: string[];
	inboundResources: string[];
	sourceSystems: SourceSystemOption[];
};

export type ApiTokenCreateInput = {
	name: string;
	warehouseIds: number[];
	eventTypes: string[];
	endpoints: string[];
	expiresAt?: string | null;
	sourceSystem?: string | null;
	inboundResources: string[];
	mappingOverride: boolean;
};

export type ApiTokenIssueResult = {
	token: ApiToken;
	/** Plaintext is returned by Flask only on create/rotate. Never persist it. */
	plaintext: string;
};
