import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const screen=readFileSync(join(process.cwd(),'src/core/feature/webhooks/ui/screens/WebhooksScreen.svelte'),'utf8');
describe('Webhooks screen contract and safety',()=>{
 it('exposes detail, stats, DLQ, global errors, and replay controls',()=>{
  for(const value of ['vm.detail(row.subscriptionId)','vm.loadStats','vm.loadDlq','vm.loadErrors','vm.replayOne','vm.replayMany']) expect(screen).toContain(value);
 });
 it('requires explicit confirmation for revocation, purge, and secret rotation',()=>{
  for(const value of ['role="alertdialog"','Confirmar revocación','Confirmar purga','Confirmar rotación']) expect(screen).toContain(value);
 });
 it('announces the one-time secret and documents missing event payload detail',()=>{
  expect(screen).toContain('role="status"');expect(screen).toContain('vm.secret.secret');
  expect(screen).toContain('payload original completo');
 });
 it('disables replay actions while a request is pending and for revoked subscriptions',()=>{
  expect(screen).toContain('disabled={vm.saving||vm.selected.status===\'revoked\'}');
  expect(screen).toContain('disabled={vm.saving}');
 });
 it('does not offer status=revoked through PATCH or a secret read endpoint',()=>{
  expect(screen).not.toContain("status:'revoked'");
  expect(screen).not.toContain('getSecret');
 });
});
