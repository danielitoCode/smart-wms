/** Both ends of a transfer must be visible to the current user. */
export function canAccessTransferWarehouses(input: {
  role: string;
  assignedWarehouseIds: readonly number[];
  sourceWarehouseId: number;
  destinationWarehouseId: number;
}): boolean {
  const { role, assignedWarehouseIds, sourceWarehouseId, destinationWarehouseId } = input;
  if (!Number.isSafeInteger(sourceWarehouseId) || sourceWarehouseId <= 0 ||
      !Number.isSafeInteger(destinationWarehouseId) || destinationWarehouseId <= 0 ||
      sourceWarehouseId === destinationWarehouseId) return false;
  return role === 'ADMIN' ||
    (assignedWarehouseIds.includes(sourceWarehouseId) && assignedWarehouseIds.includes(destinationWarehouseId));
}
