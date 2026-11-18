import { createConsumerGroupsDependencies } from '../../di/consumerGroups.dependencies';
import type {
  ConnectorCreateInput, ConnectorRegistryEntry, ConnectorUpdateInput, ConsumerGroup,
  ConsumerGroupCreateInput, ConsumerGroupUpdateInput
} from '../../domain/entity/ConsumerGroup';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

export function createConsumerGroupsState(deps = createConsumerGroupsDependencies()) {
  let groups = $state<ConsumerGroup[]>([]);
  let registry = $state<ConnectorRegistryEntry[]>([]);
  let loading = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let requestVersion = 0;

  async function load() {
    const version = ++requestVersion;
    loading = true;
    error = null;
    try {
      const [nextGroups, nextRegistry] = await Promise.all([deps.listGroups.execute(), deps.listRegistry.execute()]);
      if (version === requestVersion) { groups = nextGroups; registry = nextRegistry; }
    } catch (e) {
      if (version === requestVersion) error = toUserMessage(e, 'No se pudieron cargar los consumer groups');
    } finally {
      if (version === requestVersion) loading = false;
    }
  }
  async function perform<T>(action: () => Promise<T>, fallback: string): Promise<T | null> {
    saving = true; error = null;
    try { return await action(); }
    catch (e) { error = toUserMessage(e, fallback); return null; }
    finally { saving = false; }
  }
  async function refreshAfter<T>(action: () => Promise<T>, fallback: string): Promise<boolean> {
    const result = await perform(action, fallback);
    if (result === null) return false;
    await load();
    return true;
  }
  return {
    get groups() { return groups; }, get registry() { return registry; },
    get loading() { return loading; }, get saving() { return saving; }, get error() { return error; },
    load,
    createConnector: (input: ConnectorCreateInput) => refreshAfter(() => deps.createConnector.execute(input), 'No se pudo registrar el conector'),
    updateConnector: (input: ConnectorUpdateInput) => refreshAfter(() => deps.updateConnector.execute(input), 'No se pudo actualizar el conector'),
    removeConnector: (id: string) => refreshAfter(() => deps.removeConnector.execute(id), 'No se pudo eliminar el conector'),
    createGroup: (input: ConsumerGroupCreateInput) => refreshAfter(() => deps.createGroup.execute(input), 'No se pudo crear el consumer group'),
    updateGroup: (input: ConsumerGroupUpdateInput) => refreshAfter(() => deps.updateGroup.execute(input), 'No se pudo actualizar la suscripción'),
    removeGroup: (id: string) => refreshAfter(() => deps.removeGroup.execute(id), 'No se pudo eliminar el consumer group')
  };
}
