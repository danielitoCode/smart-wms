import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { LEGACY_ROUTE_REDIRECTS } from '#lib/navigation/legacyRouteRedirects';

export const load: PageServerLoad = () => {
  redirect(308, LEGACY_ROUTE_REDIRECTS['/transfer-orders']);
};
