import { createApiTokensDependencies } from '../../di/apiTokens.dependencies';
import type { ApiToken, ApiTokenCreateInput } from '../../domain/entity/ApiToken';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createApiTokensDependencies();

export function createApiTokensState() {
	let rows = $state<ApiToken[]>([]);
	let scopes = $state<string[]>([]);
	let loading = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let plaintext = $state<string | null>(null);

	async function load() {
		if (loading) return;
		loading = true;
		error = null;
		try {
			const [tokens, catalog] = await Promise.all([
				deps.list.execute(),
				deps.scopeCatalog.execute()
			]);
			rows = tokens;
			scopes = catalog;
		} catch (e) {
			error = toUserMessage(e, 'No se pudieron cargar los tokens');
		} finally {
			loading = false;
		}
	}

	async function create(input: ApiTokenCreateInput) {
		saving = true;
		error = null;
		plaintext = null;
		try {
			const result = await deps.create.execute(input);
			plaintext = result.plaintext;
			await load();
			return true;
		} catch (e) {
			error = toUserMessage(e, 'No se pudo crear el token');
			return false;
		} finally {
			saving = false;
		}
	}

	async function rotate(tokenId: number) {
		saving = true;
		error = null;
		plaintext = null;
		try {
			const result = await deps.rotate.execute(tokenId);
			plaintext = result.plaintext;
			await load();
			return true;
		} catch (e) {
			error = toUserMessage(e, 'No se pudo rotar el token');
			return false;
		} finally {
			saving = false;
		}
	}

	async function revoke(tokenId: number) {
		saving = true;
		error = null;
		try {
			await deps.revoke.execute(tokenId);
			await load();
			return true;
		} catch (e) {
			error = toUserMessage(e, 'No se pudo revocar el token');
			return false;
		} finally {
			saving = false;
		}
	}

	async function remove(tokenId: number) {
		saving = true;
		error = null;
		try {
			await deps.remove.execute(tokenId);
			await load();
			return true;
		} catch (e) {
			error = toUserMessage(e, 'No se pudo eliminar el token');
			return false;
		} finally {
			saving = false;
		}
	}

	return {
		get rows() { return rows; },
		get scopes() { return scopes; },
		get loading() { return loading; },
		get saving() { return saving; },
		get error() { return error; },
		get plaintext() { return plaintext; },
		clearPlaintext() { plaintext = null; },
		load,
		create,
		rotate,
		revoke,
		remove
	};
}
