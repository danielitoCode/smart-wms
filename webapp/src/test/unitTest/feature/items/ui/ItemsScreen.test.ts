import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import ItemsScreen from '../../../../../core/feature/items/ui/screens/ItemsScreen.svelte';

describe('ItemsScreen UI', () => {
	it('renders the search, filter, list and create controls with Spanish labels', () => {
		const i18n = { t: (message: string) => message };
		const { body } = render(ItemsScreen, {
			context: new Map([['i18n', i18n]])
		});

		expect(body).toContain('Productos');
		expect(body).toContain('Buscar por SKU, nombre, UPC o MPN');
		expect(body).toContain('Activos');
		expect(body).toContain('Archivados');
		expect(body).toContain('Todos');
		expect(body).toContain('Nuevo producto');
	});
});
