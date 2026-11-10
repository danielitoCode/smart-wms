import { createItemsDependencies } from '../../di/items.dependencies';
import type { Item } from '../../domain/entity/Item';

const deps = createItemsDependencies();

export function createItemsState() {
	let items = $state<Item[]>([]);
	let query = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function load(q?: string) {
		loading = true;
		error = null;
		try {
			const search = (q ?? query).trim();
			items = search
				? await deps.searchItems.execute(search)
				: await deps.listItems.execute({ active: true });
		} catch (err) {
			error = err instanceof Error ? err.message : 'No se pudieron cargar los ítems';
			items = [];
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
		setQuery,
		load
	};
}
