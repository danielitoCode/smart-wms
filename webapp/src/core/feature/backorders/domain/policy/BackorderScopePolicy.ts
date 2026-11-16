export type BackorderScopeInput = {
  role: string;
  assignedWarehouseIds: readonly number[];
  selectedWarehouseId: number | null;
};

/**
 * Resolve the warehouse filter sent by the browser.
 * Only ADMIN can request an unscoped queue. A warehouses-page grant is not
 * equivalent to global backorder access; non-admin users remain constrained
 * to one of their assigned warehouses. The API is still authoritative.
 */
export function resolveBackorderWarehouseScope(input: BackorderScopeInput): number | null {
  const selected = input.selectedWarehouseId;

  if (input.role === 'ADMIN') {
    if (selected === null) return null;
    if (!Number.isInteger(selected) || selected < 1) {
      throw new Error('El almacén seleccionado no es válido');
    }
    return selected;
  }

  if (selected === null) {
    throw new Error('Selecciona un almacén asignado antes de consultar backorders');
  }
  if (!Number.isInteger(selected) || selected < 1) {
    throw new Error('El almacén seleccionado no es válido');
  }
  if (!input.assignedWarehouseIds.includes(selected)) {
    throw new Error('No tienes acceso al almacén seleccionado');
  }
  return selected;
}
