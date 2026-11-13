import type { ConsumerGroupsRepository } from '../repository/ConsumerGroupsRepository';
import type { ConsumerGroupCreateInput } from '../entity/ConsumerGroup';

export class ListConsumerGroupsUseCase {
	constructor(private readonly repository: ConsumerGroupsRepository) {}
	execute() { return this.repository.listGroups(); }
}

export class ListConnectorRegistryUseCase {
	constructor(private readonly repository: ConsumerGroupsRepository) {}
	execute() { return this.repository.listRegistry(); }
}

export class CreateConsumerGroupUseCase {
	constructor(private readonly repository: ConsumerGroupsRepository) {}
	execute(input: ConsumerGroupCreateInput) {
		if (!input.name.trim()) throw new Error('El nombre del grupo es obligatorio');
		return this.repository.createGroup({ ...input, name: input.name.trim() });
	}
}

export class DeleteConsumerGroupUseCase {
	constructor(private readonly repository: ConsumerGroupsRepository) {}
	execute(consumerGroupId: string) {
		if (!consumerGroupId.trim()) throw new Error('Grupo inválido');
		return this.repository.removeGroup(consumerGroupId);
	}
}
