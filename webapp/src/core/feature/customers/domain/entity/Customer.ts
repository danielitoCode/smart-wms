/**
 * Customer master / projection used in admin surfaces.
 *
 * Canonical table `customers` is fed mainly by inbound (v1.7+).
 * Admin list is not exposed as a dedicated CRUD endpoint; the UI
 * projects distinct customers from sales orders and global search.
 */
export type Customer = {
  /** Stable key: customer_id when present, else name-based key */
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  orderCount: number | null;
  /** Optional warehouse scope when projected from SO list */
  warehouseId: number | null;
};

export type CustomerSearchQuery = {
  search: string;
};
