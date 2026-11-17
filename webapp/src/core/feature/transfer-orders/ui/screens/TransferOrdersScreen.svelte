<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import type { I18nState } from '../../../../../lib/i18n/i18n.svelte';
  import { createTransferOrdersState } from '../state/transferOrdersState.svelte';
  import type { CreateTransferOrder, TransferOrderLine } from '../../domain/entity/TransferOrder';

  const i18n = getContext<I18nState>('i18n');
  const vm = createTransferOrdersState();
  const statuses = ['OPEN', 'PARTIALLY_PICKED', 'AWAITING_APPROVAL', 'APPROVED', 'CLOSED', 'CANCELLED'];

  let createOpen = $state(false);
  let sourceCode = $state('');
  let destinationCode = $state('');
  let notes = $state('');
  let recordsText = $state('');
  let fileName = $state('');
  let rejectReasons = $state<Record<number, string>>({});
  let showPickerProgress = $state(false);
  let clientErrors = $state<string[]>([]);

  onMount(() => {
    void vm.loadWarehouses();
    void vm.load();
  });

  function parseCsv(source: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;
    const input = source.replace(/\r\n?/g, '\n');
    for (let i = 0; i < input.length; i += 1) {
      const char = input[i];
      if (char === '"' && quoted && input[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
      else if (char === '\n' && !quoted) { row.push(cell.trim()); if (row.some(value => value !== '')) rows.push(row); row = []; cell = ''; }
      else cell += char;
    }
    row.push(cell.trim());
    if (row.some(value => value !== '')) rows.push(row);
    return rows;
  }

  function parseRecords() {
    const rows = parseCsv(recordsText);
    if (!rows.length) return [];
    const header = rows[0].map(value => value.toLowerCase());
    const hasHeader = header.includes('sku') && header.includes('quantity');
    const skuIndex = hasHeader ? header.indexOf('sku') : 0;
    const quantityIndex = hasHeader ? header.indexOf('quantity') : 1;
    const dataRows = hasHeader ? rows.slice(1) : rows;
    return dataRows.map((cells, index) => ({
      rowIndex: index + (hasHeader ? 2 : 1),
      sku: (cells[skuIndex] ?? '').trim(),
      quantity: Number(cells[quantityIndex] ?? '')
    }));
  }

  function validateRecords() {
    const parsed = parseRecords();
    const errors: string[] = [];
    if (!parsed.length) errors.push('Agrega al menos una línea o carga un CSV.');
    parsed.forEach(row => {
      if (!row.sku) errors.push(`Fila ${row.rowIndex}: SKU obligatorio.`);
      if (!Number.isInteger(row.quantity) || row.quantity <= 0 || row.quantity > 1000000) errors.push(`Fila ${row.rowIndex}: la cantidad debe ser un entero entre 1 y 1000000.`);
    });
    if (sourceCode && destinationCode && sourceCode.trim().toUpperCase() === destinationCode.trim().toUpperCase()) errors.push('El almacén origen y el destino deben ser distintos.');
    clientErrors = errors;
    return errors.length === 0;
  }

  async function handleFile(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    fileName = file.name;
    recordsText = await file.text();
    validateRecords();
  }

  async function create() {
    if (!validateRecords()) return;
    const input: CreateTransferOrder = {
      sourceWarehouseCode: sourceCode,
      destinationWarehouseCode: destinationCode,
      notes: notes || null,
      records: parseRecords().map(row => ({ sku: row.sku, quantity: row.quantity }))
    };
    if (await vm.create(input)) {
      createOpen = false;
      sourceCode = '';
      destinationCode = '';
      notes = '';
      recordsText = '';
      fileName = '';
      clientErrors = [];
    }
  }

  function canDelete(): boolean {
    return !!vm.selected && vm.selected.status === 'OPEN'
      && vm.selected.lines.every(line => line.pickedQuantity === 0)
      && vm.selected.approvals.length === 0;
  }
  function hasPendingApproval(): boolean {
    return !!vm.selected?.approvals.some(approval => approval.status === 'PENDING');
  }
  function canStartPicking(): boolean {
    return !!vm.selected && !hasPendingApproval()
      && ['OPEN', 'PARTIALLY_PICKED'].includes(vm.selected.status)
      && vm.selected.lines.some(line => line.committedQuantity > line.pickedQuantity && line.status !== 'SHORT_CLOSED');
  }
  function hasUnsubmittedPicks(): boolean {
    return !!vm.selected && !hasPendingApproval()
      && vm.selected.lines.some(line => line.pickedQuantity > line.approvedQuantity);
  }
  function warehouseCode(id: number): string {
    return vm.warehouses.find(warehouse => warehouse.warehouseId === id)?.warehouseCode ?? String(id);
  }
  function canShortClose(line: TransferOrderLine): boolean {
    return !hasPendingApproval() && line.status !== 'APPROVED' && line.status !== 'SHORT_CLOSED'
      && line.committedQuantity > line.approvedQuantity;
  }
  function exportShortages() {
    if (!vm.created?.shortages.length) return;
    const headers = ['sku', 'requested_qty', 'available_qty', 'committed_qty', 'shortfall'];
    const rows = vm.created.shortages.map(row => [row.sku, row.requestedQuantity, row.availableQuantity, row.committedQuantity, row.shortfall]);
    const csv = [headers.join(','), ...rows.map(row => row.map(value => String(value)).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `transfer-${vm.created.toNumber}-shortages.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
</script>

<section class="page">
  <header class="page-header">
    <div>
      <p class="eyebrow">SMART WMS · INVENTARIO</p>
      <h1>{i18n.t('Transferencias internas')}</h1>
      <p class="intro">{i18n.t('Traslada inventario entre almacenes con preparación, revisión y aprobación controladas.')}</p>
    </div>
    <button class="primary" onclick={() => createOpen = !createOpen}>{i18n.t('Nueva transferencia')}</button>
  </header>

  {#if vm.error}<p class="alert error" role="alert">{vm.error}</p>{/if}
  {#if vm.notice}<p class="alert success" role="status">{vm.notice}</p>{/if}

  {#if vm.created}
    <section class="result-panel">
      <div class="result-heading">
        <div><strong>{i18n.t('Transferencia creada')}: {vm.created.toNumber}</strong><p>{vm.created.lineCount} {i18n.t('líneas registradas')}</p></div>
        <button onclick={() => vm.clearCreated()} aria-label={i18n.t('Cerrar')}>×</button>
      </div>
      {#if vm.created.shortages.length}
        <p>{i18n.t('Se reservaron cantidades parciales por falta de stock disponible. Revisa los faltantes antes de iniciar el picking.')}</p>
        <div class="table-wrap"><table><thead><tr><th>SKU</th><th>{i18n.t('Solicitado')}</th><th>{i18n.t('Disponible')}</th><th>{i18n.t('Comprometido')}</th><th>{i18n.t('Faltante')}</th></tr></thead><tbody>
          {#each vm.created.shortages as shortage}<tr><td class="mono">{shortage.sku}</td><td>{shortage.requestedQuantity}</td><td>{shortage.availableQuantity}</td><td>{shortage.committedQuantity}</td><td class="warning-text">{shortage.shortfall}</td></tr>{/each}
        </tbody></table></div>
        <div class="actions">
          <button onclick={exportShortages}>{i18n.t('Descargar faltantes CSV')}</button>
          <button class="danger" onclick={() => { if (confirm('¿Eliminar la transferencia y liberar la reserva parcial?')) void vm.remove(vm.created!.toId).then(ok => { if (ok) vm.clearCreated(); }); }}>{i18n.t('Cancelar y liberar reserva')}</button>
        </div>
      {/if}
    </section>
  {/if}

  {#if createOpen}
    <section class="editor">
      <div class="section-heading"><div><h2>{i18n.t('Crear transferencia')}</h2><p>{i18n.t('Una orden representa un único almacén origen y un único destino.')}</p></div><button onclick={() => createOpen = false}>{i18n.t('Cerrar')}</button></div>
      <div class="form-grid">
        <label>{i18n.t('Almacén origen')}
          <select bind:value={sourceCode} required>
            <option value="">{i18n.t('Seleccionar origen')}</option>
            {#each vm.warehouses as warehouse}<option value={warehouse.warehouseCode}>{warehouse.warehouseCode} · {warehouse.warehouseName}</option>{/each}
          </select>
        </label>
        <label>{i18n.t('Almacén destino')}
          <select bind:value={destinationCode} required>
            <option value="">{i18n.t('Seleccionar destino')}</option>
            {#each vm.warehouses as warehouse}<option value={warehouse.warehouseCode}>{warehouse.warehouseCode} · {warehouse.warehouseName}</option>{/each}
          </select>
        </label>
        <label class="wide">{i18n.t('Notas')}<input bind:value={notes} maxlength="2000" /></label>
        <label class="wide">{i18n.t('Archivo CSV')} <span class="muted">({i18n.t('columnas: sku, quantity')})</span>
          <input type="file" accept=".csv,text/csv" onchange={handleFile} />
          {#if fileName}<span class="muted">{fileName}</span>{/if}
        </label>
        <label class="wide">{i18n.t('Líneas de artículos')}
          <textarea rows="7" bind:value={recordsText} placeholder={'sku,quantity\nSKU-001,10\nSKU-002,5'}></textarea>
          <span class="muted">{i18n.t('Puedes cargar un CSV o pegar las filas directamente. Se admite encabezado sku,quantity.')}</span>
        </label>
      </div>
      {#if clientErrors.length}<ul class="validation-list">{#each clientErrors as item}<li>{item}</li>{/each}</ul>{/if}
      {#if vm.importErrors.length}<ul class="validation-list">{#each vm.importErrors as item}<li>Fila {item.rowIndex + 1}: {item.errorKind}{#if item.sku} · SKU {item.sku}{/if}</li>{/each}</ul>{/if}
      {#if parseRecords().length}
        <div class="preview"><strong>{parseRecords().length} {i18n.t('filas detectadas')}</strong><div class="table-wrap"><table><thead><tr><th>#</th><th>SKU</th><th>{i18n.t('Cantidad')}</th></tr></thead><tbody>
          {#each parseRecords().slice(0, 50) as item}<tr><td>{item.rowIndex}</td><td class="mono">{item.sku}</td><td>{item.quantity}</td></tr>{/each}
        </tbody></table></div></div>
      {/if}
      <div class="actions"><button onclick={() => createOpen = false}>{i18n.t('Cancelar')}</button><button class="primary" disabled={vm.saving} onclick={() => void create()}>{vm.saving ? i18n.t('Creando…') : i18n.t('Crear y reservar')}</button></div>
    </section>
  {/if}

  <section class="filters">
    <label>{i18n.t('Estado')}
      <select value={vm.status} onchange={event => { vm.setStatus(event.currentTarget.value); void vm.load(); }}>
        <option value="">{i18n.t('Todos')}</option>
        {#each statuses as value}<option value={value}>{value}</option>{/each}
      </select>
    </label>
    <label>{i18n.t('Origen')}
      <select value={vm.sourceWarehouseId ?? ''} onchange={event => { vm.setSourceWarehouse(event.currentTarget.value ? Number(event.currentTarget.value) : null); void vm.load(); }}>
        <option value="">{i18n.t('Todos')}</option>
        {#each vm.warehouses as warehouse}<option value={warehouse.warehouseId}>{warehouse.warehouseCode}</option>{/each}
      </select>
    </label>
    <label>{i18n.t('Destino')}
      <select value={vm.destinationWarehouseId ?? ''} onchange={event => { vm.setDestinationWarehouse(event.currentTarget.value ? Number(event.currentTarget.value) : null); void vm.load(); }}>
        <option value="">{i18n.t('Todos')}</option>
        {#each vm.warehouses as warehouse}<option value={warehouse.warehouseId}>{warehouse.warehouseCode}</option>{/each}
      </select>
    </label>
    <button onclick={() => void vm.load()}>{i18n.t('Actualizar')}</button>
  </section>

  <section class="list-panel">
    <div class="list-heading"><div><h2>{i18n.t('Órdenes de traslado')}</h2><p>{vm.total} {i18n.t('registros')}</p></div><span class="muted">{i18n.t('Página')} {vm.page} / {vm.pages}</span></div>
    {#if vm.loading}<p class="empty">{i18n.t('Cargando transferencias…')}</p>
    {:else if !vm.rows.length}<p class="empty">{i18n.t('No hay transferencias para estos filtros.')}</p>
    {:else}
      <div class="table-wrap"><table><thead><tr><th>{i18n.t('Orden')}</th><th>{i18n.t('Origen')}</th><th>{i18n.t('Destino')}</th><th>{i18n.t('Estado')}</th><th>{i18n.t('Creada por')}</th><th>{i18n.t('Fecha')}</th></tr></thead><tbody>
        {#each vm.rows as order (order.transferOrderId)}
          <tr>
            <td class="mono"><button class="link" onclick={() => void vm.detail(order.transferOrderId)}>{order.transferOrderNumber}</button></td><td>{warehouseCode(order.sourceWarehouseId)}</td><td>{warehouseCode(order.destinationWarehouseId)}</td><td><span class="status">{order.status}</span></td><td>{order.createdBy}</td><td>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}</td>
          </tr>
        {/each}
      </tbody></table></div>
      <div class="pagination"><button disabled={vm.page <= 1 || vm.loading} onclick={() => { vm.setPage(vm.page - 1); void vm.load(); }}>{i18n.t('Anterior')}</button><span>{vm.page} / {vm.pages}</span><button disabled={vm.page >= vm.pages || vm.loading} onclick={() => { vm.setPage(vm.page + 1); void vm.load(); }}>{i18n.t('Siguiente')}</button></div>
    {/if}
  </section>

  {#if vm.selected}
    <section class="detail-panel">
      <div class="section-heading"><div><p class="eyebrow">{i18n.t('DETALLE DE TRANSFERENCIA')}</p><h2>{vm.selected.transferOrderNumber}</h2><p>{warehouseCode(vm.selected.sourceWarehouseId)} → {warehouseCode(vm.selected.destinationWarehouseId)} · <span class="status">{vm.selected.status}</span></p></div><button onclick={() => vm.clearSelected()}>{i18n.t('Cerrar detalle')}</button></div>
      {#if vm.selected.notes}<p class="muted">{vm.selected.notes}</p>{/if}
      {#if hasPendingApproval()}
        <p class="alert error">{i18n.t('Hay un envío pendiente de aprobación. Debe aprobarse o rechazarse antes de iniciar otra preparación o enviar más cantidades.')}</p>
      {/if}
      <div class="action-bar">
        <button disabled={vm.saving || !canDelete()} onclick={() => { if (confirm('¿Eliminar definitivamente esta orden sin picking ni aprobaciones?')) void vm.remove(vm.selected!.transferOrderId).then(ok => { if (ok) vm.clearSelected(); }); }}>{i18n.t('Eliminar')}</button>
        <button disabled={vm.saving || hasPendingApproval() || vm.selected.approvals.length > 0 || !['OPEN', 'PARTIALLY_PICKED'].includes(vm.selected.status)} onclick={() => { if (confirm('¿Cancelar la transferencia y liberar la reserva no aprobada?')) void vm.cancel(vm.selected!.transferOrderId); }}>{i18n.t('Cancelar orden')}</button>
        <button disabled={vm.saving || !canStartPicking()} onclick={() => void vm.startPicking(vm.selected!.transferOrderId)}>{i18n.t('Iniciar picking')}</button>
        <button disabled={vm.saving} onclick={() => { showPickerProgress = true; void vm.loadPickerDetail(); }}>{i18n.t('Ver progreso de preparación')}</button>
        <button class="primary" disabled={vm.saving || !hasUnsubmittedPicks()} onclick={() => { if (confirm('¿Enviar las cantidades recogidas para revisión? No se moverá inventario hasta su aprobación.')) void vm.submitPickerResult(vm.selected!.transferOrderId); }}>{i18n.t('Enviar resultado de picking')}</button>
      </div>

      <h3>{i18n.t('Líneas de transferencia')}</h3>
      <div class="table-wrap"><table><thead><tr><th>SKU</th><th>{i18n.t('Artículo')}</th><th>{i18n.t('Solicitado')}</th><th>{i18n.t('Comprometido')}</th><th>{i18n.t('Recogido')}</th><th>{i18n.t('Aprobado')}</th><th>{i18n.t('Diferencia')}</th><th>{i18n.t('Estado')}</th><th>{i18n.t('Acción')}</th></tr></thead><tbody>
        {#each vm.selected.lines as line (line.toLineId)}
          <tr><td class="mono">{line.sku ?? line.itemId}</td><td>{line.itemName ?? '—'}</td><td>{line.requestedQuantity}</td><td>{line.committedQuantity}</td><td>{line.pickedQuantity}</td><td>{line.approvedQuantity}</td><td class:warning-text={line.requestedQuantity > line.committedQuantity || line.pickedQuantity < line.committedQuantity}>{line.requestedQuantity - line.committedQuantity} / {line.committedQuantity - line.pickedQuantity}</td><td><span class="status">{line.status}</span></td><td>{#if canShortClose(line)}<button disabled={vm.saving} onclick={() => { if (confirm('¿Cerrar el faltante de esta línea y liberar su reserva pendiente?')) void vm.shortClose(vm.selected!.transferOrderId, line.toLineId); }}>{i18n.t('Cerrar faltante')}</button>{/if}</td></tr>
        {/each}
      </tbody></table></div>

      {#if showPickerProgress && vm.pickerSnapshot}
        <section class="subpanel"><div class="section-heading"><div><h3>{i18n.t('Progreso del picker')}</h3><p>{vm.pickerSnapshot.transferOrderNumber} · {vm.pickerSnapshot.status}</p></div><button onclick={() => showPickerProgress = false}>{i18n.t('Ocultar')}</button></div>
          {#each vm.pickerSnapshot.lines as line}<div class="progress-row"><span class="mono">{line.sku ?? line.itemId}</span><span>{line.pickedQuantity} / {line.committedQuantity}</span><span class="status">{line.status}</span><div class="progress"><span style={'width:' + (line.committedQuantity ? Math.min(100, line.pickedQuantity / line.committedQuantity * 100) : 0) + '%'}></span></div></div>{/each}
        </section>
      {/if}

      <h3>{i18n.t('Envíos para aprobación')}</h3>
      {#if !vm.selected.approvals.length}<p class="empty">{i18n.t('Todavía no hay envíos de picking para revisar.')}</p>{:else}
        {#each vm.selected.approvals as approval (approval.approvalId)}
          <article class="approval-row"><div class="approval-meta"><strong>#{approval.approvalId} · {approval.status}</strong><span>{i18n.t('Enviado por')} {approval.submittedBy} · {approval.submittedAt ? new Date(approval.submittedAt).toLocaleString() : '—'}</span>{#if approval.approvedBy}<span>{i18n.t('Aprobado por')} {approval.approvedBy} · {approval.approvedAt ? new Date(approval.approvedAt).toLocaleString() : '—'}</span>{/if}{#if approval.rejectionReason}<p class="warning-text">{approval.rejectionReason}</p>{/if}
            {#if approval.linesSnapshot?.length}
              <div class="snapshot" aria-label={i18n.t('Cantidades incluidas en esta aprobación')}>
                <strong>{i18n.t('Snapshot del envío')}</strong>
                {#each approval.linesSnapshot as snapshotLine (snapshotLine.toLineId)}
                  {@const snapshotItem = vm.selected.lines.find(line => line.toLineId === snapshotLine.toLineId)}
                  <span>{snapshotItem?.sku ?? snapshotLine.itemId} · {i18n.t('Enviado')}: {snapshotLine.pickedQuantity}</span>
                {/each}
              </div>
            {:else}
              <p class="muted snapshot-unavailable">{i18n.t('El servidor no incluyó lines_snapshot en esta respuesta; no se puede reconstruir el contenido histórico de este envío.')}</p>
            {/if}</div>
            {#if approval.status === 'PENDING'}
              <div class="approval-actions"><button class="primary" disabled={vm.saving} onclick={() => { if (confirm('La aprobación mueve el inventario del origen al destino. ¿Continuar?')) void vm.approve(vm.selected!.transferOrderId, approval.approvalId); }}>{i18n.t('Aprobar y mover inventario')}</button><input maxlength="1000" placeholder={i18n.t('Motivo de rechazo (opcional)')} value={rejectReasons[approval.approvalId] ?? ''} oninput={event => rejectReasons = { ...rejectReasons, [approval.approvalId]: event.currentTarget.value }} /><button class="danger" disabled={vm.saving} onclick={() => void vm.reject(vm.selected!.transferOrderId, approval.approvalId, rejectReasons[approval.approvalId] ?? '')}>{i18n.t('Rechazar')}</button></div>
            {/if}
          </article>
        {/each}
      {/if}
    </section>
  {/if}
</section>

<style>
  .page{max-width:90rem;margin:1.5rem auto;padding:0 1.25rem;color:var(--ink);display:grid;gap:1rem}.page-header,.section-heading,.list-heading,.result-heading{display:flex;justify-content:space-between;align-items:center;gap:1rem}.page-header{margin-bottom:.25rem}.eyebrow{font-size:.67rem;font-weight:700;letter-spacing:.14em;color:var(--slate);margin:0 0 .35rem}h1,h2,h3,p{margin-top:0}h1{font:700 1.7rem var(--disp);margin-bottom:.3rem}h2{font:700 1.15rem var(--disp);margin-bottom:.25rem}h3{font:700 .95rem var(--disp);margin:1.25rem 0 .65rem}.intro,.muted,.list-heading p,.section-heading p{color:var(--slate);font-size:.86rem;margin-bottom:0}.primary{background:var(--navy);color:#fff;border-color:var(--navy)}button{border:1px solid var(--line);border-radius:8px;padding:.52rem .75rem;background:var(--card);color:var(--ink);font:inherit;font-size:.82rem;cursor:pointer}button:disabled{opacity:.45;cursor:not-allowed}.danger,.warning-text{color:var(--danger)}.alert{padding:.75rem 1rem;border-radius:9px;font-size:.85rem}.error{background:var(--danger-bg);color:var(--danger)}.success{background:var(--success-bg);color:var(--success)}.editor,.filters,.list-panel,.detail-panel,.result-panel{border:1px solid var(--line);border-radius:13px;background:var(--card);padding:1rem}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem}.form-grid label,.filters label{display:grid;gap:.35rem;font-size:.78rem;color:var(--slate)}.wide{grid-column:1/-1}input,select,textarea{width:100%;min-width:0;border:1px solid var(--line);border-radius:8px;padding:.58rem .68rem;background:var(--surface);color:var(--ink);font:inherit;font-size:.85rem}textarea{resize:vertical}.actions,.action-bar,.approval-actions,.pagination{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}.actions{justify-content:flex-end;margin-top:1rem}.filters{display:flex;align-items:end;gap:.8rem;flex-wrap:wrap}.filters label{min-width:10rem}.filters button{height:2.35rem}.list-heading{margin-bottom:.75rem}.table-wrap{width:100%;overflow:auto;border:1px solid var(--line);border-radius:9px}table{width:100%;border-collapse:collapse;white-space:nowrap;font-size:.81rem}th,td{text-align:left;padding:.65rem .75rem;border-bottom:1px solid var(--line)}th{font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;color:var(--slate);background:var(--surface)}tbody tr:last-child td{border-bottom:0}.link{border:0;background:transparent;padding:0;color:var(--link);text-decoration:underline;font:inherit;cursor:pointer}.link:hover{color:var(--gold-ink)}.mono{font-family:var(--mono,monospace)}.status{display:inline-flex;border-radius:99px;padding:.2rem .5rem;background:var(--surface);font-size:.68rem;font-weight:700}.empty{padding:1.2rem;color:var(--slate);text-align:center;font-size:.85rem}.pagination{justify-content:flex-end;margin-top:.8rem;font-size:.8rem;color:var(--slate)}.detail-panel{padding:1.15rem}.action-bar{padding:.8rem 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin:.8rem 0}.approval-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(18rem,1fr);gap:1rem;padding:.85rem 0;border-bottom:1px solid var(--line)}.approval-meta{display:grid;gap:.25rem;font-size:.82rem}.approval-meta span{color:var(--slate)}.snapshot{display:grid;gap:.25rem;margin-top:.55rem;padding:.65rem;border:1px solid var(--line);border-radius:8px;background:var(--surface);font-size:.78rem}.snapshot-unavailable{margin-top:.55rem;font-size:.76rem}.approval-actions{align-content:start}.approval-actions input{flex:1;min-width:12rem}.subpanel{margin:1rem 0;padding:1rem;border:1px solid var(--line);border-radius:10px;background:var(--surface)}.progress-row{display:grid;grid-template-columns:minmax(8rem,1fr) 5rem 9rem minmax(8rem,2fr);gap:.75rem;align-items:center;padding:.45rem 0;font-size:.8rem}.progress{height:7px;background:var(--line);border-radius:99px;overflow:hidden}.progress span{display:block;height:100%;background:var(--gold);border-radius:99px}.validation-list{color:var(--danger);font-size:.8rem}.preview{margin-top:.8rem}.result-panel{border-color:var(--warning);background:var(--card)}.result-heading p{font-size:.8rem;color:var(--slate);margin:.2rem 0}.warning-text{font-weight:600}@media(max-width:760px){.page-header,.section-heading{align-items:flex-start;flex-direction:column}.form-grid{grid-template-columns:1fr}.wide{grid-column:auto}.filters{align-items:stretch;flex-direction:column}.filters label{width:100%}.approval-row{grid-template-columns:1fr}.progress-row{grid-template-columns:1fr auto}.progress-row .progress{grid-column:1/-1}.action-bar button{flex:1 1 45%}}
</style>
