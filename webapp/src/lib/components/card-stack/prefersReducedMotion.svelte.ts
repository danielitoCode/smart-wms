/**
 * prefers-reduced-motion store for Svelte 5.
 */
import { browser } from '$app/environment';

function getMatch(): boolean {
	if (!browser) return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let reduced = $state(getMatch());

if (browser) {
	const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
	const onChange = () => {
		reduced = mq.matches;
	};
	if (typeof mq.addEventListener === 'function') {
		mq.addEventListener('change', onChange);
	} else {
		(mq as MediaQueryList & { addListener: (l: () => void) => void }).addListener(onChange);
	}
}

export function getPrefersReducedMotion(): boolean {
	return reduced;
}
