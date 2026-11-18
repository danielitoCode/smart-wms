/**
 * @deprecated Use createSalesOrdersDependencies from sales-orders.dependencies.
 * This compatibility factory keeps the former use-case keys available while
 * all wiring is owned by the canonical dependency module.
 */
import { createSalesOrdersDependencies } from './sales-orders.dependencies';

export { createSalesOrdersDependencies };

export function createSalesOrderDependencies() {
  const dependencies = createSalesOrdersDependencies();
  return {
    list: dependencies.listSalesOrders,
    get: dependencies.getSalesOrder,
    related: dependencies.getRelatedSalesOrders,
    create: dependencies.createSalesOrder,
    update: dependencies.updateSalesOrder,
    cancel: dependencies.cancelSalesOrder,
    addLine: dependencies.addSalesOrderLine,
    updateLine: dependencies.updateSalesOrderLine,
    deleteLine: dependencies.deleteSalesOrderLine,
    adminPick: dependencies.adminPickSalesOrder,
    adminShip: dependencies.adminShipSalesOrder,
    partialFulfill: dependencies.partialFulfillSalesOrder,
    revertStatus: dependencies.revertSalesOrderStatus,
    createRma: dependencies.createSalesOrderRma,
    receiveReturn: dependencies.receiveSalesOrderReturn,
    voidReturn: dependencies.voidSalesOrderReturn
  };
}
