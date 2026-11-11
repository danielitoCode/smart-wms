import { describe, expect, it } from 'vitest';
import { translate } from './translations';

describe('Smart WMS interface translations', () => {
	it('uses Italian as the primary interface language', () => {
		expect(translate('it', 'Recepción')).toBe('Ricevimento');
		expect(translate('it', 'Lote de trabajo')).toBe('Lotto di lavoro');
	});

	it('supports Spanish and English without changing source identifiers', () => {
		expect(translate('es', 'Recepción')).toBe('Recepción');
		expect(translate('en', 'Recepción')).toBe('Receiving');
		expect(translate('en', 'SKU')).toBe('SKU');
	});

	it('falls back to the source copy for untranslated phrases', () => {
		expect(translate('it', 'Unmapped backend status')).toBe('Unmapped backend status');
	});
});
