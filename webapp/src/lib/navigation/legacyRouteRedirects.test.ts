import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEGACY_ROUTE_REDIRECTS } from './legacyRouteRedirects';

describe('React-era route compatibility (R10)', () => {
  it('keeps the legacy paths mapped to SvelteKit canonical routes', () => {
    expect(Object.keys(LEGACY_ROUTE_REDIRECTS).sort()).toEqual([
      '/adjustments',
      '/api-tokens',
      '/audit-log',
      '/backorders',
      '/bins',
      '/channels',
      '/consumer-groups',
      '/count-approvals',
      '/cycle-counts',
      '/fraud',
      '/imports',
      '/inbound',
      '/integrations',
      '/inter-warehouse-transfers',
      '/notifications',
      '/pos-activity',
      '/preferred-bins',
      '/purchase-orders',
      '/returns',
      '/returns/refunds',
      '/returns/rma',
      '/rma',
      '/settings',
      '/transfer-orders',
      '/users',
      '/vendors',
      '/webhooks',
      '/zones'
    ].sort());
  });

  it('uses absolute, non-self-referential canonical destinations', () => {
    for (const [legacyPath, destination] of Object.entries(LEGACY_ROUTE_REDIRECTS)) {
      expect(destination.startsWith('/'), legacyPath).toBe(true);
      expect(destination, legacyPath).not.toBe(legacyPath);
      expect(destination.startsWith('/lab/'), legacyPath).toBe(false);
    }
  });

  it('has a SvelteKit page and server redirect wrapper for every legacy path', () => {
    for (const legacyPath of Object.keys(LEGACY_ROUTE_REDIRECTS)) {
      const routeDirectory = join(process.cwd(), 'src/routes/(app)', legacyPath.slice(1));
      const serverPage = join(routeDirectory, '+page.server.ts');
      const pageComponent = join(routeDirectory, '+page.svelte');

      expect(existsSync(serverPage), legacyPath).toBe(true);
      expect(existsSync(pageComponent), legacyPath).toBe(true);
      expect(readFileSync(serverPage, 'utf8')).toContain(
        `LEGACY_ROUTE_REDIRECTS['${legacyPath}']`
      );
    }
  });

  it('preserves the RMA and master-data destinations', () => {
    expect(LEGACY_ROUTE_REDIRECTS['/rma']).toBe('/management/returns');
    expect(LEGACY_ROUTE_REDIRECTS['/returns/rma']).toBe('/management/returns');
    expect(LEGACY_ROUTE_REDIRECTS['/returns/refunds']).toBe('/management/refunds');
    expect(LEGACY_ROUTE_REDIRECTS['/bins']).toBe('/data/bins');
    expect(LEGACY_ROUTE_REDIRECTS['/zones']).toBe('/data/zones');
    expect(LEGACY_ROUTE_REDIRECTS['/preferred-bins']).toBe('/data/preferred-bins');
  });
});
