import type { AdminOperationKey } from '../domain/entity/AdminOperation.ts';

export type AdminOperationDefinition = {
  key: AdminOperationKey;
  title: string;
  description: string;
  pageKey: string;
  /** Permission checked by the corresponding Flask endpoint. */
  apiPermission: string;
  warehouseScoped?: boolean;
  searchable?: boolean;
  columns: { key: string; label: string }[];
};

function columns(entries: [string, string][]) {
  return entries.map(([key, label]) => ({ key, label }));
}

export const ADMIN_OPERATION_CATALOG: Record<string, AdminOperationDefinition> = {
  backorders: {
    key: 'backorders',
    title: 'Pedidos pendientes',
    description: 'Pedidos pendientes por falta de existencias.',
    pageKey: 'backorders',
    apiPermission: 'backorders',
    warehouseScoped: true,
    columns: columns([
      ['so_number', 'Pedido'],
      ['parent_so_number', 'Pedido original'],
      ['customer_name', 'Cliente'],
      ['status', 'Estado'],
      ['days_waiting', 'Días pendientes'],
      ['items', 'Artículos']
    ])
  },
  'count-approvals': {
    key: 'count-approvals',
    title: 'Aprobación de conteos',
    description: 'Diferencias generadas por conteos cíclicos.',
    pageKey: 'count-approvals',
    apiPermission: 'adjustments',
    columns: columns([
      ['adjustment_id', 'Ajuste'],
      ['cycle_count_id', 'Conteo'],
      ['sku', 'SKU'],
      ['item_name', 'Producto'],
      ['bin_code', 'Ubicación'],
      ['expected_quantity', 'Cantidad esperada'],
      ['counted_quantity', 'Cantidad contada'],
      ['quantity_change', 'Diferencia']
    ])
  },
  fraud: {
    key: 'fraud',
    title: 'Revisión de pedidos',
    description: 'Pedidos retenidos antes de preparación.',
    pageKey: 'sales-orders',
    apiPermission: 'sales-orders',
    searchable: true,
    columns: columns([
      ['so_number', 'Pedido'],
      ['customer_name', 'Cliente'],
      ['customer_phone', 'Teléfono'],
      ['order_source', 'Origen'],
      ['status', 'Estado'],
      ['created_at', 'Fecha'],
      ['memo', 'Observaciones']
    ])
  },
  'inter-warehouse-transfers': {
    key: 'inter-warehouse-transfers',
    title: 'Movimientos entre almacenes',
    description: 'Movimientos físicos confirmados entre almacenes.',
    pageKey: 'transfer-orders',
    apiPermission: 'transfer-orders',
    columns: columns([
      ['transfer_id', 'Movimiento'],
      ['sku', 'SKU'],
      ['item_name', 'Producto'],
      ['quantity', 'Cantidad'],
      ['from_warehouse_name', 'Almacén origen'],
      ['from_bin_code', 'Ubicación origen'],
      ['to_warehouse_name', 'Almacén destino'],
      ['to_bin_code', 'Ubicación destino'],
      ['transferred_by', 'Responsable'],
      ['transferred_at', 'Fecha'],
      ['status', 'Estado']
    ])
  },
  adjustments: {
    key: 'adjustments',
    title: 'Ajustes de inventario',
    description: 'Historial de correcciones de existencias.',
    pageKey: 'adjustments',
    apiPermission: 'adjustments',
    warehouseScoped: true,
    columns: columns([
      ['adjustment_id', 'Ajuste'],
      ['sku', 'SKU'],
      ['item_name', 'Producto'],
      ['bin_code', 'Ubicación'],
      ['quantity_change', 'Variación'],
      ['reason_code', 'Motivo'],
      ['status', 'Estado'],
      ['adjusted_by', 'Registrado por'],
      ['adjusted_at', 'Fecha']
    ])
  },
  'pos-activity': {
    key: 'pos-activity',
    title: 'Actividad del punto de venta',
    description: 'Ventas y devoluciones registradas en terminales POS.',
    pageKey: 'pos-activity',
    apiPermission: 'pos-activity',
    columns: columns([
      ['so_number', 'Pedido'],
      ['created_at', 'Fecha'],
      ['channel', 'Canal'],
      ['status', 'Estado'],
      ['terminal_id', 'Terminal'],
      ['customer_name', 'Cliente'],
      ['total_cents', 'Total (centavos)'],
      ['payment_method', 'Pago'],
      ['external_txn_ref', 'Referencia']
    ])
  },
  'preferred-bins': {
    key: 'preferred-bins',
    title: 'Ubicaciones preferidas',
    description: 'Ubicaciones de picking preferidas por producto.',
    pageKey: 'preferred-bins',
    apiPermission: 'preferred-bins',
    searchable: true,
    columns: columns([
      ['sku', 'SKU'],
      ['item_name', 'Producto'],
      ['bin_code', 'Ubicación'],
      ['zone_name', 'Zona'],
      ['priority', 'Prioridad'],
      ['updated_at', 'Actualizado']
    ])
  },
  'purchase-orders': {
    key: 'purchase-orders',
    title: 'Órdenes de compra',
    description: 'Órdenes de compra y estado de recepción.',
    pageKey: 'purchase-orders',
    apiPermission: 'purchase-orders',
    warehouseScoped: true,
    searchable: true,
    columns: columns([
      ['po_number', 'Orden'],
      ['vendor_name', 'Proveedor'],
      ['warehouse_id', 'Almacén'],
      ['status', 'Estado'],
      ['expected_date', 'Fecha prevista'],
      ['created_at', 'Creada']
    ])
  },
  refunds: {
    key: 'refunds',
    title: 'Reembolsos',
    description: 'Documentos de crédito asociados a ventas originales.',
    pageKey: 'sales-orders',
    apiPermission: 'sales-orders',
    searchable: true,
    columns: columns([
      ['so_number', 'Documento'],
      ['parent_so_number', 'Venta original'],
      ['customer_name', 'Cliente'],
      ['status', 'Estado'],
      ['order_total', 'Importe'],
      ['created_at', 'Fecha']
    ])
  },
  returns: {
    key: 'returns',
    title: 'Devoluciones y RMA',
    description: 'Devoluciones y estado de recepción de mercancía.',
    pageKey: 'sales-orders',
    apiPermission: 'sales-orders',
    searchable: true,
    columns: columns([
      ['so_number', 'RMA'],
      ['parent_so_number', 'Venta original'],
      ['customer_name', 'Cliente'],
      ['status', 'Estado'],
      ['created_at', 'Fecha'],
      ['memo', 'Observaciones']
    ])
  },
  'transfer-orders': {
    key: 'transfer-orders',
    title: 'Órdenes de traslado',
    description: 'Reposición de mercancía entre almacenes.',
    pageKey: 'transfer-orders',
    apiPermission: 'transfer-orders',
    columns: columns([
      ['to_number', 'Orden'],
      ['source_warehouse_id', 'Origen'],
      ['destination_warehouse_id', 'Destino'],
      ['status', 'Estado'],
      ['created_by', 'Creada por'],
      ['created_at', 'Creada']
    ])
  },
  users: {
    key: 'users',
    title: 'Usuarios y permisos',
    description: 'Cuentas, roles y alcance operativo.',
    pageKey: 'users',
    apiPermission: 'users',
    columns: columns([
      ['username', 'Usuario'],
      ['full_name', 'Nombre'],
      ['role', 'Rol'],
      ['is_active', 'Activo'],
      ['warehouse_ids', 'Almacenes'],
      ['created_at', 'Creado']
    ])
  },
  vendors: {
    key: 'vendors',
    title: 'Proveedores',
    description: 'Catálogo de proveedores y datos de contacto.',
    pageKey: 'vendors',
    apiPermission: 'vendors',
    searchable: true,
    columns: columns([
      ['vendor_name', 'Proveedor'],
      ['contact_name', 'Contacto'],
      ['email', 'Correo'],
      ['phone', 'Teléfono'],
      ['payment_terms', 'Condiciones de pago'],
      ['is_active', 'Activo']
    ])
  }
};
