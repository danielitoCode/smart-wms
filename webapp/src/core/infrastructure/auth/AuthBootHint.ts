/**
 * Client-side hint for cold-start routing.
 * HttpOnly cookie is backend authority; this only remembers whether the browser
 * has successfully signed in before, so we can distinguish:
 * - anonymous first visit → landing
 * - expired / inactive session after prior login → login
 */

const STORAGE_KEY = 'smartwms.authBoot';

function canUseStorage(): boolean {
	return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export const authBootHint = {
	/** Call after a successful login. */
	markKnown(): void {
		if (!canUseStorage()) return;
		try {
			localStorage.setItem(STORAGE_KEY, '1');
		} catch {
			/* storage blocked */
		}
	},

	/** Call after explicit logout (next `/` cold start → landing). */
	clear(): void {
		if (!canUseStorage()) return;
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch {
			/* ignore */
		}
	},

	/** True if this browser completed login at least once (and not cleared). */
	hasKnownSession(): boolean {
		if (!canUseStorage()) return false;
		try {
			return localStorage.getItem(STORAGE_KEY) === '1';
		} catch {
			return false;
		}
	}
};
