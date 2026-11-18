import { createChannelsDependencies } from '../../di/channels.dependencies';
import type { Channel, ChannelCreateInput } from '../../domain/entity/Channel';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createChannelsDependencies();

export function createChannelsState() {
	let rows = $state<Channel[]>([]);
	let loading = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);

	async function load() {
		if (loading) return;
		loading = true; error = null;
		try { rows = await deps.list.execute(); }
		catch (e) { error = toUserMessage(e, 'No se pudieron cargar los canales'); }
		finally { loading = false; }
	}

	async function create(input: ChannelCreateInput) {
		saving = true; error = null;
		try { await deps.create.execute(input); await load(); return true; }
		catch (e) { error = toUserMessage(e, 'No se pudo crear el canal'); return false; }
		finally { saving = false; }
	}

	async function remove(channelId: string) {
		saving = true; error = null;
		try { await deps.remove.execute(channelId); await load(); return true; }
		catch (e) { error = toUserMessage(e, 'No se pudo eliminar el canal'); return false; }
		finally { saving = false; }
	}

	return {
		get rows() { return rows; },
		get loading() { return loading; },
		get saving() { return saving; },
		get error() { return error; },
		load, create, remove
	};
}
