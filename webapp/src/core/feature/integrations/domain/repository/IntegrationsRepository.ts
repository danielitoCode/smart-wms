import type { Connector } from '../entity/Connector';

export interface IntegrationsRepository {
	listConnectors(): Promise<Connector[]>;
	test(name: string): Promise<{ ok: boolean; message: string | null }>;
}
