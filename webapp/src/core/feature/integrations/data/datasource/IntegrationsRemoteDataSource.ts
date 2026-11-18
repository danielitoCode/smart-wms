import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import type { ConnectorsResponseDto, TestConnectorResponseDto } from '../dto/ConnectorDto';

export class IntegrationsRemoteDataSource {
	constructor(private readonly api: ApiClient) {}
	list() { return this.api.get<ConnectorsResponseDto>('/api/admin/connectors'); }
	test(name: string) {
		return this.api.post<TestConnectorResponseDto>(`/api/admin/connectors/${encodeURIComponent(name)}/test`, {});
	}
}
