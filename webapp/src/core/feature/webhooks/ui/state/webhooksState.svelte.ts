import { createWebhooksDependencies } from '../../di/webhooks.dependencies';
import type { WebhookSubscription, WebhookCreateInput } from '../../domain/entity/WebhookSubscription';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createWebhooksDependencies();

export function createWebhooksState() {
	let rows = $state<WebhookSubscription[]>([]);
	let loading = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let secret = $state<string | null>(null);

	async function load() {
		if (loading) return;
		loading = true; error = null;
		try { rows = await deps.list.execute(); }
		catch (e) { error = toUserMessage(e, 'No se pudieron cargar los webhooks'); }
		finally { loading = false; }
	}

	async function create(input: WebhookCreateInput) {
		saving = true; error = null;
		try { await deps.create.execute(input); await load(); return true; }
		catch (e) { error = toUserMessage(e, 'No se pudo crear el webhook'); return false; }
		finally { saving = false; }
	}

	async function remove(id: string) {
		saving = true; error = null;
		try { await deps.remove.execute(id); await load(); return true; }
		catch (e) { error = toUserMessage(e, 'No se pudo eliminar el webhook'); return false; }
		finally { saving = false; }
	}

	async function rotateSecret(id: string) {
		saving = true; error = null; secret = null;
		try {
			const result = await deps.rotateSecret.execute(id);
			secret = result.secret;
			await load();
			return true;
		} catch (e) {
			error = toUserMessage(e, 'No se pudo rotar el secreto');
			return false;
		} finally { saving = false; }
	}

	return {
		get rows() { return rows; },
		get loading() { return loading; },
		get saving() { return saving; },
		get error() { return error; },
		get secret() { return secret; },
		clearSecret() { secret = null; },
		load, create, remove, rotateSecret
	};
}
