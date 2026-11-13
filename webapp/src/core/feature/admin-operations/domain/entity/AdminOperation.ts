export type AdminOperationKey = 'backorders' | 'count-approvals' | 'fraud' | 'inter-warehouse-transfers' | 'adjustments' | 'pos-activity' | 'preferred-bins' | 'purchase-orders' | 'refunds' | 'returns' | 'transfer-orders' | 'users' | 'vendors';
export type AdminOperationQuery = { warehouseId?: number | null; search?: string; tab?: 'waiting' | 'ready-to-ship'; date?: string; status?: string; page?: number; perPage?: number };
export type AdminOperationCell = string | number | boolean | null;
export type AdminOperationRow = { id: string | number; cells: Record<string, AdminOperationCell> };
export type AdminOperationPagination = { page: number; perPage: number; total: number; pages: number };
export type AdminOperationPosSummary = { today: { sales_count: number; refund_count: number; net_cents: number; sales_total_cents: number; refund_total_cents: number; avg_sale_cents: number; counter_cents: number; counter_count: number; phone_cents: number; phone_count: number } };
export type AdminOperationResult = { rows: AdminOperationRow[]; summary: AdminOperationPosSummary | null; pagination: AdminOperationPagination | null };
