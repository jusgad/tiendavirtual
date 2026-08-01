import { OrderStatus } from '@prisma/client'
import {
  AdminReportsRepository,
  OrdersByStatus,
  SalesReport,
  SalesReportFilter,
  TopProduct,
} from '../../../src/modules/admin/domain/ports'

export class FakeAdminReportsRepository implements AdminReportsRepository {
  salesReportCalls: SalesReportFilter[] = []
  topProductsLimits: number[] = []
  salesReportResult: SalesReport = { points: [], totalOrders: 0, totalRevenue: 0 }
  topProductsResult: TopProduct[] = []
  ordersByStatusResult: OrdersByStatus[] = Object.values(OrderStatus).map((status) => ({ status, count: 0 }))

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
