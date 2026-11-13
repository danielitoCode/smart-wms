import type { AdminOperationKey, AdminOperationProjectionMap } from '../domain/entity/AdminOperation.ts';

export type AdminOperationColumnFormat =
  | 'text'
  | 'date'
  | 'status'
  | 'boolean'
  | 'quantity'
  | 'money'
  | 'cents'
  | 'list'
  | 'backorder-items';

export type AdminOperationColumn<K extends AdminOperationKey> = {
  key: keyof AdminOperationProjectionMap[K];
  label: string;
  format?: AdminOperationColumnFormat;
} satisfies AdminOperationCatalog;

export type AdminOperationDefinition<K extends AdminOperationKey> = {
  key: AdminOperationKey;
  title: string;
  description: string;
  pageKey: string;
  /** Permission checked by the corresponding Flask endpoint. */
  apiPermission: string;
  warehouseScoped?: boolean;
  searchable?: boolean;
  dateFilter?: boolean;
  channelFilter?: boolean;
  terminalFilter?: boolean;
  cashierFilter?: boolean;
  warehouseIdFilters?: boolean;
  activeFilter?: boolean;
  statusOptions?: string[];
  columns: AdminOperationColumn<K>[];
};

type AdminOperationCatalog = {
  [K in AdminOperationKey]: AdminOperationDefinition<K>;
};

function columns<K extends AdminOperationKey>(entries: AdminOperationColumn<K>[]): AdminOperationColumn<K>[] {
  return entries;
}

const salesOrderStatuses = [
  'OPEN',
  'PICKED',
  'PACKED',
  'SHIPPED',
  'CANCELLED',
  'REFUNDED'
];

export const ADMIN_OPERATION_CATALOG = {
  backorders: {
    key: 'backorders',
    title: 'Pedidos pendientes',
    description: 'Pedidos pendientes por falta de existencias.',
    pageKey: 'backorders',
    apiPermission: 'backorders',
    warehouseScoped: true,
    columns: columns<'backorders'>([
      { key: 'salesOrderNumber', label: 'Pedido' },
      { key: 'parentSalesOrderNumber', label: 'Pedido original' },
      { key: 'customerName', label: 'Cliente' },
      { key: 'status', label: 'Estado', format: 'status' },
      { key: 'daysWaiting', label: 'Días pendientes', format: 'quantity' },
      { key: 'items', label: 'Artículos', format: 'backorder-items' }
    ])
  },
  'count-approvals': {
    key: 'count-approvals',
    title: 'Aprobación de conteos',
    description: 'Diferencias generadas por conteos cíclicos.',
    pageKey: 'count-approvals',
    apiPermission: 'adjustments',
    columns: columns<'count-approvals'>([
      { key: 'cycleCountId', label: 'Conteo' },
      { key: 'sku', label: 'SKU' },
      { key: 'itemName', label: 'Producto' },
      { key: 'binCode', label: 'Ubicación' },
      { key: 'expectedQuantity', label: 'Esperado', format: 'quantity' },
      { key: 'countedQuantity', label: 'Contado', format: 'quantity' },
      { key: 'quantityChange', label: 'Diferencia', format: 'quantity' },
      { key: 'reasonDetail', label: 'Observación' }
    ])
  },
  fraud: {
    key: 'fraud',
    title: 'Revisión de pedidos',
    description: 'Pedidos retenidos antes de preparación.',
    pageKey: 'sales-orders',
    apiPermission: 'sales-orders',
    searchable: true,
    columns: columns<'fraud'>([
      { key: 'salesOrderNumber', label: 'Pedido' },
      { key: 'customerName', label: 'Cliente' },
      { key: 'customerPhone', label: 'Teléfono' },
      { key: 'orderType', label: 'Tipo' },
      { key: 'status', label: 'Estado', format: 'status' },
      { key: 'createdAt', label: 'Fecha', format: 'date' },
      { key: 'memo', label: 'Observaciones' }
    ])
  },
  'inter-warehouse-transfers': {
    key: 'inter-warehouse-transfers',
    title: 'Movimientos entre almacenes',
    description: 'Movimientos físicos confirmados entre almacenes.',
    pageKey: 'transfer-orders',
    apiPermission: 'transfer-orders',
    columns: columns<'inter-warehouse-transfers'>([
      { key: 'transferId', label: 'Movimiento' },
      { key: 'sku', label: 'SKU' },
      { key: 'itemName', label: 'Producto' },
      { key: 'quantity', label: 'Cantidad', format: 'quantity' },
      { key: 'sourceWarehouseName', label: 'Almacén origen' },
      { key: 'sourceWarehouseCode', label: 'Código origen' },
      { key: 'sourceBinCode', label: 'Ubicación origen' },
      { key: 'destinationWarehouseName', label: 'Almacén destino' },
      { key: 'destinationWarehouseCode', label: 'Código destino' },
      { key: 'destinationBinCode', label: 'Ubicación destino' },
      { key: 'transferredBy', label: 'Responsable' },
      { key: 'transferredAt', label: 'Fecha', format: 'date' },
      { key: 'status', label: 'Estado', format: 'status' }
    ])
  },
  adjustments: {
    key: 'adjustments',
    title: 'Ajustes de inventario',
    description: 'Historial de correcciones de existencias.',
    pageKey: 'adjustments',
    apiPermission: 'adjustments',
    warehouseScoped: true,
    columns: columns<'adjustments'>([
      { key: 'adjustmentId', label: 'Ajuste' },
      { key: 'sku', label: 'SKU' },
      { key: 'itemName', label: 'Producto' },
      { key: 'binCode', label: 'Ubicación' },
      { key: 'expectedQuantity', label: 'Esperado', format: 'quantity' },
      { key: 'countedQuantity', label: 'Contado', format: 'quantity' },
      { key: 'quantityChange', label: 'Variación', format: 'quantity' },
      { key: 'reasonCode', label: 'Motivo' },
      { key: 'reasonDetail', label: 'Detalle' },
      { key: 'status', label: 'Estado', format: 'status' },
      { key: 'adjustedBy', label: 'Registrado por' },
      { key: 'adjustedAt', label: 'Fecha', format: 'date' }
    ])
  },
  'pos-activity': {
    key: 'pos-activity',
    title: 'Actividad del punto de venta',
    description: 'Ventas y devoluciones registradas en terminales POS.',
    pageKey: 'pos-activity',
    apiPermission: 'pos-activity',
    dateFilter: true,
    channelFilter: true,
    terminalFilter: true,
    cashierFilter: true,
    statusOptions: salesOrderStatuses,
    columns: columns<'pos-activity'>([
      { key: 'salesOrderNumber', label: 'Pedido' },
      { key: 'orderType', label: 'Tipo' },
      { key: 'createdAt', label: 'Fecha', format: 'date' },
      { key: 'channel', label: 'Canal' },
      { key: 'status', label: 'Estado', format: 'status' },
      { key: 'terminalId', label: 'Terminal' },
      { key: 'customerName', label: 'Cliente' },
      { key: 'totalCents', label: 'Total', format: 'cents' },
      { key: 'paymentMethod', label: 'Pago' },
      { key: 'externalTransactionReference', label: 'Referencia' }
    ])
  },
  'preferred-bins': {
    key: 'preferred-bins',
    title: 'Ubicaciones preferidas',
    description: 'Ubicaciones de picking preferidas por producto.',
    pageKey: 'preferred-bins',
    apiPermission: 'preferred-bins',
    searchable: true,
    columns: columns<'preferred-bins'>([
      { key: 'sku', label: 'SKU' },
      { key: 'itemName', label: 'Producto' },
      { key: 'binCode', label: 'Ubicación' },
      { key: 'zoneName', label: 'Zona' },
      { key: 'priority', label: 'Prioridad', format: 'quantity' },
      { key: 'notes', label: 'Notas' },
      { key: 'updatedAt', label: 'Actualizado', format: 'date' }
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
    statusOptions: ['OPEN', 'PARTIAL', 'RECEIVED', 'CLOSED', 'ARCHIVED'],
    columns: columns<'purchase-orders'>([
      { key: 'purchaseOrderNumber', label: 'Orden' },
      { key: 'vendorName', label: 'Proveedor' },
      { key: 'warehouseId', label: 'Almacén' },
      { key: 'status', label: 'Estado', format: 'status' },
      { key: 'expectedDate', label: 'Fecha prevista', format: 'date' },
      { key: 'createdAt', label: 'Creada', format: 'date' },
      { key: 'receivedAt', label: 'Recibida', format: 'date' },
      { key: 'createdBy', label: 'Creada por' }
    ])
  },
  refunds: {
    key: 'refunds',
    title: 'Reembolsos',
    description: 'Documentos de crédito asociados a ventas originales.',
    pageKey: 'sales-orders',
    apiPermission: 'sales-orders',
    searchable: true,
    columns: columns<'refunds'>([
      { key: 'salesOrderNumber', label: 'Documento' },
      { key: 'parentSalesOrderId', label: 'ID venta original' },
      { key: 'customerName', label: 'Cliente' },
      { key: 'status', label: 'Estado', format: 'status' },
      { key: 'createdAt', label: 'Fecha', format: 'date' }
    ])
  },
  returns: {
    key: 'returns',
    title: 'Devoluciones y RMA',
    description: 'Devoluciones y estado de recepción de mercancía.',
    pageKey: 'sales-orders',
    apiPermission: 'sales-orders',
    searchable: true,
    columns: columns<'returns'>([
      { key: 'salesOrderNumber', label: 'RMA' },
      { key: 'parentSalesOrderId', label: 'ID venta original' },
      { key: 'customerName', label: 'Cliente' },
      { key: 'status', label: 'Estado', format: 'status' },
      { key: 'createdAt', label: 'Fecha', format: 'date' },
      { key: 'memo', label: 'Observaciones' }
    ])
  },
  'transfer-orders': {
    key: 'transfer-orders',
    title: 'Órdenes de traslado',
    description: 'Reposición de mercancía entre almacenes.',
    pageKey: 'transfer-orders',
    apiPermission: 'transfer-orders',
    statusOptions: ['OPEN', 'PARTIALLY_PICKED', 'AWAITING_APPROVAL', 'APPROVED', 'CLOSED', 'CANCELLED'],
    warehouseIdFilters: true,
    columns: columns<'transfer-orders'>([
      { key: 'transferOrderNumber', label: 'Orden' },
      { key: 'sourceWarehouseId', label: 'Origen' },
      { key: 'destinationWarehouseId', label: 'Destino' },
      { key: 'status', label: 'Estado', format: 'status' },
      { key: 'createdBy', label: 'Creada por' },
      { key: 'notes', label: 'Notas' },
      { key: 'createdAt', label: 'Creada', format: 'date' },
      { key: 'updatedAt', label: 'Actualizada', format: 'date' }
    ])
  },
  users: {
    key: 'users',
    title: 'Usuarios y permisos',
    description: 'Cuentas, roles y alcance operativo.',
    pageKey: 'users',
    apiPermission: 'users',
    columns: columns<'users'>([
      { key: 'username', label: 'Usuario' },
      { key: 'fullName', label: 'Nombre' },
      { key: 'role', label: 'Rol' },
      { key: 'active', label: 'Activo', format: 'boolean' },
      { key: 'warehouseIds', label: 'Almacenes', format: 'list' },
      { key: 'allowedFunctions', label: 'Funciones permitidas', format: 'list' },
      { key: 'createdAt', label: 'Creado', format: 'date' },
      { key: 'lastLogin', label: 'Último acceso', format: 'date' }
    ])
  },
  vendors: {
    key: 'vendors',
    title: 'Proveedores',
    description: 'Catálogo de proveedores y datos de contacto.',
    pageKey: 'vendors',
    apiPermission: 'vendors',
    searchable: true,
    activeFilter: true,
    columns: columns<'vendors'>([
      { key: 'vendorName', label: 'Proveedor' },
      { key: 'contactName', label: 'Contacto' },
      { key: 'email', label: 'Correo' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'paymentTerms', label: 'Condiciones de pago' },
      { key: 'active', label: 'Activo', format: 'boolean' }
    ])
  }
};
