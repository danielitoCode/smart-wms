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
			else if (/\.(svelte|ts)$/.test(entry.name) && !entry.name.includes('translations')) {
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

describe('Smart WMS interface translations (F0.5)', () => {
	it('uses Italian as the primary interface language', () => {
		expect(translate('it', 'Recepción')).toBe('Ricevimento');
		expect(translate('it', 'Lote de trabajo')).toBe('Lotto di lavoro');
	});

	it('treats Spanish as complete canonical source (identity)', () => {
		expect(translate('es', 'Recepción')).toBe('Recepción');
		expect(translate('es', 'Inventario')).toBe('Inventario');
		const es = getTranslationCoverage('es', sourceKeys);
		expect(es.percentage).toBe(100);
		expect(es.missing).toEqual([]);
	});

	it('covers every literal translation call in IT and EN', () => {
		const italian = getTranslationCoverage('it', sourceKeys);
		const english = getTranslationCoverage('en', sourceKeys);
		expect(italian.missing, `Missing Italian keys (${italian.missing.length}): ${italian.missing.slice(0, 12).join(' | ')}`).toEqual([]);
		expect(english.missing, `Missing English keys (${english.missing.length}): ${english.missing.slice(0, 12).join(' | ')}`).toEqual([]);
		expect(italian.percentage).toBe(100);
		expect(english.percentage).toBe(100);
	});

	it('falls back to source copy for an unknown phrase', () => {
		expect(translate('it', 'Unmapped backend status')).toBe('Unmapped backend status');
	});
});

describe('No hardcoded business labels in screens (spot rules)', () => {
	it('LoginScreen routes visible labels through i18n.t', () => {
		const src = readFileSync(join(process.cwd(), 'src/core/feature/auth/ui/screens/LoginScreen.svelte'), 'utf8');
		expect(src).toMatch(/i18n\.t\(['"]Usuario['"]\)/);
		expect(src).toMatch(/i18n\.t\(['"]Contraseña['"]\)/);
		expect(src).toMatch(/i18n\.t\(['"]Entrar['"]\)/);
		expect(src).not.toMatch(/>\s*Usuario\s*</);
	});
});
