import { translate, type Locale } from './translations';

export type I18nState = ReturnType<typeof createI18nState>;
const supported: Locale[] = ['it', 'es', 'en'];

export function createI18nState() {
	let locale = $state<Locale>('it');
	return {
		get locale() { return locale; },
		t(source: string) { return translate(locale, source); },
		setLocale(next: string) {
			if (!supported.includes(next as Locale)) return;
			locale = next as Locale;
			if (typeof document !== 'undefined') document.documentElement.lang = locale;
			if (typeof localStorage !== 'undefined') localStorage.setItem('abellis-locale', locale);
		},
		init() {
			if (typeof localStorage === 'undefined') return;
			const saved = localStorage.getItem('abellis-locale');
			this.setLocale(saved && supported.includes(saved as Locale) ? saved : 'it');
		}
	};
}
