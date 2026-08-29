import { OrderStatus as PrismaOrderStatus } from '@prisma/client'
import {
  AdminOrderDetail,
  AdminOrderFilter,
  AdminOrderRepository,
  AdminOrderSummary,
  AdminReportsRepository,
  CatalogCacheInvalidator,
  OrdersByStatus,
  Paginated,
  SalesReport,
  SalesReportFilter,
  TopProduct,
} from '../../../src/modules/admin/domain/ports'
import { OrderStatus } from '../../../src/modules/admin/domain/orderStatus'

export class FakeAdminReportsRepository implements AdminReportsRepository {
  salesReportCalls: SalesReportFilter[] = []
  topProductsLimits: number[] = []
  salesReportResult: SalesReport = { points: [], totalOrders: 0, totalRevenue: 0 }
  topProductsResult: TopProduct[] = []
  ordersByStatusResult: OrdersByStatus[] = Object.values(PrismaOrderStatus).map((status) => ({ status, count: 0 }))

  async salesReport(filter: SalesReportFilter): Promise<SalesReport> {
    this.salesReportCalls.push(filter)
    return this.salesReportResult
  }

  async topProducts(limit: number): Promise<TopProduct[]> {
    this.topProductsLimits.push(limit)
    return this.topProductsResult
  }

  async ordersByStatus(): Promise<OrdersByStatus[]> {
    return this.ordersByStatusResult
  }
}

// -------- Gestión de pedidos --------

function detalle(base: { id: string; orderNumber: string; status: OrderStatus }): AdminOrderDetail {
  return {
    ...base,
    total: 79900,
    currency: 'COP',
    contactEmail: 'ana@correo.com',
    shipCity: 'Medellín',
    createdAt: new Date('2026-08-01T10:00:00Z'),
    subtotal: 79900,
    discountTotal: 0,
    shippingTotal: 0,
    discreetPackaging: false,
    items: [{ productId: 'prod-1', productName: 'Estuche PomAss Día + Noche', quantity: 1, lineTotal: 79900 }],
  }
}

export class InMemoryAdminOrderRepository implements AdminOrderRepository {
  orders: AdminOrderDetail[] = []
  /** Último valor de `restoreStock` recibido: permite comprobar si se devolvió stock. */
  lastRestoreStock: boolean | null = null

  add(base: { id: string; orderNumber: string; status: OrderStatus }) {
    this.orders.push(detalle(base))
  }

  async list(filter: AdminOrderFilter): Promise<Paginated<AdminOrderSummary>> {
    const filtrados = filter.status ? this.orders.filter((o) => o.status === filter.status) : this.orders
    const inicio = (filter.page - 1) * filter.pageSize
    return {
      items: filtrados.slice(inicio, inicio + filter.pageSize),
      total: filtrados.length,
      page: filter.page,
      pageSize: filter.pageSize,
    }
  }

  async findById(id: string): Promise<AdminOrderDetail | null> {
    return this.orders.find((o) => o.id === id) ?? null
  }

  async updateStatus(id: string, status: OrderStatus, restoreStock: boolean): Promise<AdminOrderDetail> {
    this.lastRestoreStock = restoreStock
    const order = this.orders.find((o) => o.id === id)!
    order.status = status
    return order
  }
}

export class SpyCatalogCache implements CatalogCacheInvalidator {
  invalidations = 0
  async invalidate(): Promise<void> {
    this.invalidations++
  }
}
