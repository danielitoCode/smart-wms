import { translate, type Locale } from './translations';

export type I18nState = ReturnType<typeof createI18nState>;
const supported: Locale[] = ['it', 'es', 'en'];

export function createI18nState() {
	let locale = $state<Locale>('it');
	function applyLocale(next: Locale) {
		locale = next;
		if (typeof document !== 'undefined') document.documentElement.lang = locale;
		try { localStorage.setItem('abellis-locale', locale); } catch { /* Storage may be disabled by browser policy. */ }
	}
	return {
		get locale() { return locale; },
		t(source: string) { return translate(locale, source); },
		setLocale(next: string) {
			if (!supported.includes(next as Locale)) return;
			applyLocale(next as Locale);
		},
		init() {
			let saved: string | null = null;
			try { saved = localStorage.getItem('abellis-locale'); } catch { /* Keep the Italian default when storage is unavailable. */ }
			applyLocale(saved && supported.includes(saved as Locale) ? saved as Locale : 'it');
		}
	};
}
