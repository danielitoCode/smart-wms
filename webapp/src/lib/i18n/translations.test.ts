import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getTranslationCoverage, translate } from './translations';

function collectLiteralTranslationKeys(root: string): string[] {
	const found = new Set<string>();
	function visit(directory: string) {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const path = join(directory, entry.name);
			if (entry.isDirectory()) visit(path);
			else if (/\.(svelte|ts)$/.test(entry.name)) {
				const source = readFileSync(path, 'utf8');
				const calls = /\b(?:i18n\.)?t\(\s*(['"])(.*?)\1\s*\)/gs;
				for (const match of source.matchAll(calls)) found.add(match[2]);
			}
		}
	}
	visit(root);
	return [...found];
}

const sourceKeys = collectLiteralTranslationKeys(join(process.cwd(), 'src'));

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
	it('covers every literal translation call found in Svelte/TypeScript source', () => {
		const italian = getTranslationCoverage('it', sourceKeys);
		const english = getTranslationCoverage('en', sourceKeys);
		expect(italian.missing, `Missing Italian keys: ${italian.missing.join(' | ')}`).toEqual([]);
		expect(english.missing, `Missing English keys: ${english.missing.join(' | ')}`).toEqual([]);
		expect(italian.percentage).toBe(100);
		expect(english.percentage).toBe(100);
	});
	it('falls back to source copy for an unknown phrase', () => {
		expect(translate('it', 'Unmapped backend status')).toBe('Unmapped backend status');
	});
});
