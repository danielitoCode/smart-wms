import { createItemsDependencies } from '../../di/items.dependencies';
import type { Item } from '../../domain/entity/Item';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createItemsDependencies();

export function createItemsState() {
	let items = $state<Item[]>([]);
	let query = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let loadedOnce = $state(false);

	async function load(q?: string) {
		if (loading) return false;
		loading = true;
		error = null;
		try {
			const search = (q ?? query).trim();
			items = search
				? await deps.searchItems.execute(search)
				: await deps.listItems.execute({ active: true });
			loadedOnce = true;
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudieron cargar los ítems');
			items = [];
			return false;
		} finally {
			loading = false;
		}
	}

	function setQuery(value: string) {
		query = value;
	}

	return {
		get items() {
			return items;
		},
		get query() {
			return query;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		get loadedOnce() {
			return loadedOnce;
		},
		setQuery,
		load
	};
}
