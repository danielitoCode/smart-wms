import { createConsumerGroupsDependencies } from '../../di/consumerGroups.dependencies';
import type { ConnectorRegistryEntry, ConsumerGroup, ConsumerGroupCreateInput } from '../../domain/entity/ConsumerGroup';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createConsumerGroupsDependencies();

export function createConsumerGroupsState() {
	let groups = $state<ConsumerGroup[]>([]);
	let registry = $state<ConnectorRegistryEntry[]>([]);
	let loading = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);

	async function load() {
		if (loading) return;
		loading = true;
		error = null;
		try {
			const [g, r] = await Promise.all([deps.listGroups.execute(), deps.listRegistry.execute()]);
			groups = g;
			registry = r;
		} catch (e) {
			error = toUserMessage(e, 'No se pudieron cargar los consumer groups');
		} finally {
			loading = false;
		}
	}

	async function create(input: ConsumerGroupCreateInput) {
		saving = true;
		error = null;
		try {
			await deps.createGroup.execute(input);
			await load();
			return true;
		} catch (e) {
			error = toUserMessage(e, 'No se pudo crear el grupo');
			return false;
		} finally {
			saving = false;
		}
	}

	async function remove(id: string) {
		saving = true;
		error = null;
		try {
			await deps.removeGroup.execute(id);
			await load();
			return true;
		} catch (e) {
			error = toUserMessage(e, 'No se pudo eliminar el grupo');
			return false;
		} finally {
			saving = false;
		}
	}

	return {
		get groups() { return groups; },
		get registry() { return registry; },
		get loading() { return loading; },
		get saving() { return saving; },
		get error() { return error; },
		load,
		create,
		remove
	};
}
