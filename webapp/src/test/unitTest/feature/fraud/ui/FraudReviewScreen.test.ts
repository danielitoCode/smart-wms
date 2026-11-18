import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const screen = readFileSync(
  join(process.cwd(), 'src/core/feature/fraud/ui/screens/FraudReviewScreen.svelte'),
  'utf8'
);

describe('Fraud review screen regression contract', () => {
  it('renders server-backed pagination controls for the queue', () => {
    expect(screen).toContain('vm.page');
    expect(screen).toContain('vm.pages');
    expect(screen).toContain('vm.total');
    expect(screen).toContain('Paginación de pedidos');
  });

  it('renders a paginated audit timeline in the order detail', () => {
    expect(screen).toContain('vm.auditEntries');
    expect(screen).toContain('vm.auditPage');
    expect(screen).toContain('vm.auditPages');
    expect(screen).toContain('Historial de auditoría');
    expect(screen).toContain('JSON.stringify(entry.details, null, 2)');
  });

  it('does not describe the server-side warehouse or audit controls as missing', () => {
    expect(screen).not.toContain('Alcance de seguridad pendiente');
    expect(screen).not.toContain('el backend no ofrece un endpoint');
  });
});
