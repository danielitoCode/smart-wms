/** UI-side guard for printable ticket detail. Flask must still enforce this scope server-side. */
export function canViewPickingTicketInWarehouse(input: {
  role: string | null | undefined;
  selectedWarehouseId: number | null | undefined;
  ticketWarehouseId: number;
}): boolean {
  if (!Number.isInteger(input.ticketWarehouseId) || input.ticketWarehouseId <= 0) return false;
  if (input.role === 'ADMIN') return true;
  return Number.isInteger(input.selectedWarehouseId) && input.selectedWarehouseId === input.ticketWarehouseId;
}
