import { createIntegrationsDependencies } from '../../di/integrations.dependencies';
import type { Connector } from '../../domain/entity/Connector';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createIntegrationsDependencies();

export function createIntegrationsState() {
	let rows = $state<Connector[]>([]);
	let loading = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let message = $state<string | null>(null);

	async function load() {
		if (loading) return;
		loading = true; error = null;
		try { rows = await deps.list.execute(); }
		catch (e) { error = toUserMessage(e, 'No se pudieron cargar las integraciones'); }
		finally { loading = false; }
	}

	async function test(name: string) {
		saving = true; error = null; message = null;
		try {
			const result = await deps.test.execute(name);
			message = result.ok ? 'Prueba correcta' : (result.message ?? 'Prueba fallida');
			return result.ok;
		} catch (e) {
			error = toUserMessage(e, 'No se pudo probar el conector');
			return false;
		} finally { saving = false; }
	}

	return {
		get rows() { return rows; },
		get loading() { return loading; },
		get saving() { return saving; },
		get error() { return error; },
		get message() { return message; },
		load, test
	};
}
