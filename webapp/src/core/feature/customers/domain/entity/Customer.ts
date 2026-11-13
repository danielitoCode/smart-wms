/**
 * Read-only customer projection exposed by the admin global-search API.
 *
 * The current WMS admin contract does not expose customer CRUD: customer
 * identity and contact snapshots are stored on sales_orders. Keep this
 * model honest instead of treating inbound canonical IDs as editable rows.
 */
export type Customer = {
  id: string;
  name: string;
  orderCount: number;
};

export type CustomerSearchQuery = {
  search: string;
};
