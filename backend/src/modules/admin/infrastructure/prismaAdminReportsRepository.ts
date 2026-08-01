import { PrismaClient } from '@prisma/client'
import {
  AdminReportsRepository,
  OrdersByStatus,
  SalesReportFilter,
  SalesReport,
  TopProduct,
  SALE_STATUSES,
} from '../domain/ports'
import { OrderStatus } from '../domain/orderStatus'
import { toDomainOrderStatus, toPrismaOrderStatus } from './orderStatusMapper'

/** 'YYYY-MM-DD' o 'YYYY-MM' según agrupación, en UTC para evitar desfases por huso horario. */
function periodKey(date: Date, groupBy: 'day' | 'month'): string {
  const iso = date.toISOString()
  return groupBy === 'day' ? iso.slice(0, 10) : iso.slice(0, 7)
}

export class PrismaAdminReportsRepository implements AdminReportsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async salesReport(filter: SalesReportFilter): Promise<SalesReport> {
    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: SALE_STATUSES.map(toPrismaOrderStatus) },
        createdAt: { gte: filter.from, lte: filter.to },
      },
      select: { total: true, createdAt: true },
    })

    const byPeriod = new Map<string, { orders: number; revenue: number }>()
    let totalRevenue = 0
    for (const order of orders) {
      const key = periodKey(order.createdAt, filter.groupBy)
      const revenue = Number(order.total)
      const point = byPeriod.get(key) ?? { orders: 0, revenue: 0 }
      point.orders += 1
      point.revenue += revenue
      byPeriod.set(key, point)
      totalRevenue += revenue
    }

    const points = [...byPeriod.entries()]
      .map(([period, v]) => ({ period, orders: v.orders, revenue: v.revenue }))
      .sort((a, b) => a.period.localeCompare(b.period))

    return { points, totalOrders: orders.length, totalRevenue }
  }

  async topProducts(limit: number): Promise<TopProduct[]> {
    const grouped = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { status: { in: SALE_STATUSES.map(toPrismaOrderStatus) } } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    })

    if (grouped.length === 0) return []

    const products = await this.prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) } },
      select: { id: true, name: true },
    })
    const nameById = new Map(products.map((p) => [p.id, p.name]))

    return grouped.map((g) => ({
      productId: g.productId,
      name: nameById.get(g.productId) ?? '(producto eliminado)',
      quantitySold: g._sum.quantity ?? 0,
      revenue: Number(g._sum.lineTotal ?? 0),
    }))
  }

  async ordersByStatus(): Promise<OrdersByStatus[]> {
    const grouped = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
    })
    const counts = new Map(grouped.map((g) => [toDomainOrderStatus(g.status), g._count._all]))
    return Object.values(OrderStatus).map((status) => ({ status, count: counts.get(status) ?? 0 }))
  }
}
