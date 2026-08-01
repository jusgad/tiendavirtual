import { AdminReportsRepository, OrdersByStatus, SalesGroupBy, SalesReport, TopProduct } from '../domain/ports'
import { resolveGroupBy, resolveSalesRange, resolveTopProductsLimit } from '../domain/reportFilters'

export class GetSalesReportUseCase {
  constructor(private readonly reports: AdminReportsRepository) {}

  async execute(from: Date | undefined, to: Date | undefined, groupBy: SalesGroupBy | undefined): Promise<SalesReport> {
    const range = resolveSalesRange(from, to)
    return this.reports.salesReport({ ...range, groupBy: resolveGroupBy(groupBy) })
  }
}

export class GetTopProductsUseCase {
  constructor(private readonly reports: AdminReportsRepository) {}

  async execute(limit: number | undefined): Promise<TopProduct[]> {
    return this.reports.topProducts(resolveTopProductsLimit(limit))
  }
}

export class GetOrdersByStatusUseCase {
  constructor(private readonly reports: AdminReportsRepository) {}

  async execute(): Promise<OrdersByStatus[]> {
    return this.reports.ordersByStatus()
  }
}
