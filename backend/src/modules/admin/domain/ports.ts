import { OrderStatus } from './orderStatus'
import { ShipmentData } from './orderTransitions'

/** Estados que cuentan como venta real (excluye PENDING sin pagar y CANCELLED). */
export const SALE_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PREPARING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
]

export type SalesGroupBy = 'day' | 'month'

export interface SalesReportFilter {
  from: Date
  to: Date
  groupBy: SalesGroupBy
}

export interface SalesPoint {
  period: string // 'YYYY-MM-DD' o 'YYYY-MM' según groupBy
  orders: number
  revenue: number
}

export interface SalesReport {
  points: SalesPoint[]
  totalOrders: number
  totalRevenue: number
}

export interface TopProduct {
  productId: string
  name: string
  quantitySold: number
  revenue: number
}

export interface OrdersByStatus {
  status: OrderStatus
  count: number
}

// -------- Gestión de pedidos --------

export interface AdminOrderItem {
  productId: string
  productName: string
  quantity: number
  lineTotal: number
}

export interface AdminOrderSummary {
  id: string
  orderNumber: string
  status: OrderStatus
  total: number
  currency: string
  /** Correo de contacto: del usuario dueño, o `guestEmail` si es de invitado. */
  contactEmail: string | null
  shipCity: string | null
  createdAt: Date
}

export interface AdminOrderDetail extends AdminOrderSummary {
  subtotal: number
  discountTotal: number
  shippingTotal: number
  discreetPackaging: boolean
  // Snapshot de envío: es lo que se necesita para empacar y despachar.
  shipFullName: string | null
  shipPhone: string | null
  shipLine1: string | null
  shipLine2: string | null
  shipDepartment: string | null
  shipPostalCode: string | null
  // Rastreo: se llenan al pasar el pedido a SHIPPED.
  carrier: string | null
  trackingNumber: string | null
  items: AdminOrderItem[]
}

export interface AdminOrderFilter {
  status?: OrderStatus
  page: number
  pageSize: number
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// -------- Puertos --------

export interface AdminReportsRepository {
  salesReport(filter: SalesReportFilter): Promise<SalesReport>
  topProducts(limit: number): Promise<TopProduct[]>
  ordersByStatus(): Promise<OrdersByStatus[]>
}

export interface AdminOrderRepository {
  list(filter: AdminOrderFilter): Promise<Paginated<AdminOrderSummary>>
  findById(id: string): Promise<AdminOrderDetail | null>
  /**
   * Cambia el estado del pedido. `restoreStock` devuelve las unidades al
   * catálogo (cancelaciones antes del despacho); debe ocurrir en la misma
   * transacción que el cambio de estado. `shipment` solo llega al despachar.
   */
  updateStatus(
    id: string,
    status: OrderStatus,
    restoreStock: boolean,
    shipment?: ShipmentData,
  ): Promise<AdminOrderDetail>
}

/** El cambio de estado invalida el caché del catálogo si devolvió stock. */
export interface CatalogCacheInvalidator {
  invalidate(): Promise<void>
}
