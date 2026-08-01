import { OrderStatus } from './orderStatus'

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

// -------- Puerto --------

export interface AdminReportsRepository {
  salesReport(filter: SalesReportFilter): Promise<SalesReport>
  topProducts(limit: number): Promise<TopProduct[]>
  ordersByStatus(): Promise<OrdersByStatus[]>
}
