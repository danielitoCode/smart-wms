import { redirect } from '@sveltejs/kit';
import { getCanonicalRouteRedirect } from '$lib/navigation/routeAliases';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ url }) => {
	const destination = getCanonicalRouteRedirect(url);
	if (destination) redirect(308, destination);
};
