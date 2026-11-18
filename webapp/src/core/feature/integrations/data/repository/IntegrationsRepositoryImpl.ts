import type { IntegrationsRepository } from '../../domain/repository/IntegrationsRepository';
import type { Connector } from '../../domain/entity/Connector';
import { IntegrationsRemoteDataSource } from '../datasource/IntegrationsRemoteDataSource';
import { ConnectorMapper } from '../mapper/ConnectorMapper';

export class IntegrationsRepositoryImpl implements IntegrationsRepository {
	constructor(private readonly remote: IntegrationsRemoteDataSource) {}
	async listConnectors(): Promise<Connector[]> {
		const response = await this.remote.list();
		return (response.connectors ?? []).map(ConnectorMapper.toDomain);
	}
	async test(name: string) {
		const dto = await this.remote.test(name);
		return { ok: Boolean(dto.ok ?? dto.success), message: dto.message ?? null };
	}
}
