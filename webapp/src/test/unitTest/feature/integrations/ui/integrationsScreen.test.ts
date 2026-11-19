import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const screen = readFileSync(join(process.cwd(), 'src/core/feature/integrations/ui/screens/IntegrationsScreen.svelte'), 'utf8');

describe('Integrations screen accessibility contract', () => {
  it('exposes connector selection state to assistive technology', () => {
    expect(screen).toContain('aria-pressed={selectedName === connector.name}');
    expect(screen).toContain('aria-label={i18n.t(\'Catálogo de conectores\')}');
  });
  it('associates schema fields with labels and marks required values', () => {
    expect(screen).toContain('for={`credential-${key}`}');
    expect(screen).toContain('id={`credential-${key}`}');
    expect(screen).toContain('aria-required={schema.required ? \'true\' : undefined}');
  });
  it('announces operation results and failures through live status roles', () => {
    expect(screen).toContain('<UiStatePanel kind="error"');
    expect(screen).toContain('role="status"');
  });
  it('does not reveal existing credential values in the form', () => {
    expect(screen).toContain("return 'password'");
    expect(screen).toContain('Deja vacío para conservar el valor actual');
    expect(screen).not.toContain('value={item.value}');
  });
});
