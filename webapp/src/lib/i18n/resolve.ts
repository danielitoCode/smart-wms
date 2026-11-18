import {
	translate as baseTranslate,
	getTranslationCoverage as baseCoverage,
	type Locale,
	type TranslationCoverage
} from './translations';
import { gapTranslations } from './translations.gap';

export type { Locale, TranslationCoverage };

export function translate(locale: Locale, source: string): string {
	if (locale === 'es') return source;
	const gap = gapTranslations[locale]?.[source];
	if (gap) return gap;
	return baseTranslate(locale, source);
}

export function getTranslationCoverage(
	locale: Locale,
	sourceKeys: readonly string[] = []
): TranslationCoverage {
	const base = baseCoverage(locale, sourceKeys);
	if (locale === 'es') return base;
	const gap = gapTranslations[locale] ?? {};
	const missing = base.missing.filter((key) => !(key in gap) || !gap[key]?.trim());
	const total = base.total;
	const translated = total - missing.length;
	return {
		locale,
		total,
		translated,
		missing,
		percentage: total === 0 ? 100 : Math.round((translated / total) * 10000) / 100
	};
}
