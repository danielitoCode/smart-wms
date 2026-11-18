import type { IntegrationsRepository } from '../repository/IntegrationsRepository';

export class ListConnectorsUseCase {
	constructor(private readonly repository: IntegrationsRepository) {}
	execute() { return this.repository.listConnectors(); }
}

export class TestConnectorUseCase {
	constructor(private readonly repository: IntegrationsRepository) {}
	execute(name: string) {
		if (!name.trim()) throw new Error('Conector inválido');
		return this.repository.test(name);
	}
}
