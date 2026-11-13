import { createNotificationsDependencies } from '../../di/notifications.dependencies';
import type { NotificationWebhook, NotificationWebhookCreateInput } from '../../domain/entity/NotificationWebhook';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createNotificationsDependencies();

export function createNotificationsState() {
	let rows = $state<NotificationWebhook[]>([]);
	let loading = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let message = $state<string | null>(null);

	async function load() {
		if (loading) return;
		loading = true; error = null;
		try { rows = await deps.list.execute(); }
		catch (e) { error = toUserMessage(e, 'No se pudieron cargar las notificaciones'); }
		finally { loading = false; }
	}

	async function create(input: NotificationWebhookCreateInput) {
		saving = true; error = null; message = null;
		try { await deps.create.execute(input); await load(); return true; }
		catch (e) { error = toUserMessage(e, 'No se pudo crear la notificación'); return false; }
		finally { saving = false; }
	}

	async function remove(id: string) {
		saving = true; error = null;
		try { await deps.remove.execute(id); await load(); return true; }
		catch (e) { error = toUserMessage(e, 'No se pudo eliminar'); return false; }
		finally { saving = false; }
	}

	async function testSend(id: string) {
		saving = true; error = null; message = null;
		try { await deps.testSend.execute(id); message = 'Prueba enviada'; return true; }
		catch (e) { error = toUserMessage(e, 'No se pudo enviar la prueba'); return false; }
		finally { saving = false; }
	}

	return {
		get rows() { return rows; },
		get loading() { return loading; },
		get saving() { return saving; },
		get error() { return error; },
		get message() { return message; },
		load, create, remove, testSend
	};
}
