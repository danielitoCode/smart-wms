import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { getCanonicalRouteRedirect } from '#lib/navigation/routeAliases';

/**
 * Resolve reviewed legacy URLs before SvelteKit route matching.
 * This also keeps redirects working for old bookmarks if the target route
 * is later removed or moved to a different route group.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const destination = getCanonicalRouteRedirect(event.url);
	if (destination) redirect(308, destination);

	return resolve(event);
};
