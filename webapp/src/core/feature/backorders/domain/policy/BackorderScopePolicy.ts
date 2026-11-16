export type BackorderScopeInput = {
  role: string;
  allowedPages: readonly string[];
  assignedWarehouseIds: readonly number[];
  selectedWarehouseId: number | null;
};

/**
 * Resolve the warehouse filter sent by the browser. This is a UI guard;
 * the API remains authoritative and must enforce warehouse scope server-side.
 */
export function resolveBackorderWarehouseScope(input: BackorderScopeInput): number | null {
  const canBrowseAll = input.role === 'ADMIN' || input.allowedPages.includes('warehouses');
  const selected = input.selectedWarehouseId;

  if (selected === null) {
    if (canBrowseAll) return null;
    throw new Error('Selecciona un almacén asignado antes de consultar backorders');
  }
  if (!Number.isInteger(selected) || selected < 1) {
    throw new Error('El almacén seleccionado no es válido');
  }
  if (!canBrowseAll && !input.assignedWarehouseIds.includes(selected)) {
    throw new Error('No tienes acceso al almacén seleccionado');
  }
  return selected;
}
