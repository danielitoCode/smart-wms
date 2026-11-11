import { describe, expect, it } from 'vitest';
import { getTranslationCoverage, translate } from './translations';

describe('Smart WMS interface translations', () => {
	it('uses Italian as the primary interface language', () => {
		expect(translate('it', 'Recepción')).toBe('Ricevimento');
		expect(translate('it', 'Lote de trabajo')).toBe('Lotto di lavoro');
	});
	it('supports Spanish canonical copy and English translations', () => {
		expect(translate('es', 'Recepción')).toBe('Recepción');
		expect(translate('en', 'Recepción')).toBe('Receiving');
		expect(translate('en', 'SKU')).toBe('SKU');
	});
	it('reports complete registered-catalog coverage for Italian and English', () => {
		const italian = getTranslationCoverage('it');
		const english = getTranslationCoverage('en');
		expect(italian.total).toBeGreaterThan(0);
		expect(italian.missing).toEqual([]);
		expect(english.missing).toEqual([]);
		expect(italian.percentage).toBe(100);
		expect(english.percentage).toBe(100);
	});
	it('falls back to source copy for an unknown phrase', () => {
		expect(translate('it', 'Unmapped backend status')).toBe('Unmapped backend status');
	});
});
