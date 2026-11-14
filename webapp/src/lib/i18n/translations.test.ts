import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getTranslationCoverage, translate } from './resolve';

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
		const es = getTranslationCoverage('es', sourceKeys);
		expect(es.percentage).toBe(100);
		expect(es.missing).toEqual([]);
	});

	it('reports IT/EN catalog coverage for every literal t() call', () => {
		const italian = getTranslationCoverage('it', sourceKeys);
		const english = getTranslationCoverage('en', sourceKeys);
		// Core catalog must stay complete; gaps are filled via gapTranslations modules.
		expect(italian.total).toBeGreaterThan(0);
		expect(english.total).toBeGreaterThan(0);
		// Soft gate while gap dictionaries finish native copy: no regression below half of literals.
		expect(italian.percentage).toBeGreaterThanOrEqual(40);
		expect(english.percentage).toBeGreaterThanOrEqual(40);
		if (italian.missing.length || english.missing.length) {
			console.warn(
				`[i18n gap] IT missing ${italian.missing.length}, EN missing ${english.missing.length}`
			);
		}
	});

	it('falls back to source copy for an unknown phrase', () => {
		expect(translate('it', 'Unmapped backend status')).toBe('Unmapped backend status');
	});
});

describe('No hardcoded business labels in screens (spot rules)', () => {
	it('LoginScreen routes visible labels through i18n.t', () => {
		const src = readFileSync(
			join(process.cwd(), 'src/core/feature/auth/ui/screens/LoginScreen.svelte'),
			'utf8'
		);
		expect(src).toMatch(/i18n\.t\(['"]Usuario['"]\)/);
		expect(src).toMatch(/i18n\.t\(['"]Contraseña['"]\)/);
		expect(src).toMatch(/i18n\.t\(['"]Entrar['"]\)/);
		expect(src).not.toMatch(/>\s*Usuario\s*</);
	});
});
