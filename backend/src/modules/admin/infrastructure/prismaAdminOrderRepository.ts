import { Prisma, PrismaClient } from '@prisma/client'
import {
  AdminOrderDetail,
  AdminOrderFilter,
  AdminOrderRepository,
  AdminOrderSummary,
  Paginated,
} from '../domain/ports'
import { OrderStatus } from '../domain/orderStatus'
import { toDomainOrderStatus, toPrismaOrderStatus } from './orderStatusMapper'

type OrderRow = Prisma.OrderGetPayload<{
  include: { items: true; user: { select: { email: true } } }
}>

function toSummary(o: OrderRow): AdminOrderSummary {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: toDomainOrderStatus(o.status),
    total: Number(o.total),
    currency: o.currency,
    contactEmail: o.user?.email ?? o.guestEmail,
    shipCity: o.shipCity,
    createdAt: o.createdAt,
  }
}

function toDetail(o: OrderRow): AdminOrderDetail {
  return {
    ...toSummary(o),
    subtotal: Number(o.subtotal),
    discountTotal: Number(o.discountTotal),
    shippingTotal: Number(o.shippingTotal),
    discreetPackaging: o.discreetPackaging,
    items: o.items.map((it) => ({
      productId: it.productId,
      productName: it.productName,
      quantity: it.quantity,
      lineTotal: Number(it.lineTotal),
    })),
  }
}

const INCLUDE = { items: true, user: { select: { email: true } } } as const

export class PrismaAdminOrderRepository implements AdminOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(filter: AdminOrderFilter): Promise<Paginated<AdminOrderSummary>> {
    const where = filter.status ? { status: toPrismaOrderStatus(filter.status) } : {}
    const skip = (filter.page - 1) * filter.pageSize

    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: filter.pageSize,
      }),
      this.prisma.order.count({ where }),
    ])

    return {
      items: rows.map(toSummary),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    }
  }

  async findById(id: string): Promise<AdminOrderDetail | null> {
    const order = await this.prisma.order.findUnique({ where: { id }, include: INCLUDE })
    return order ? toDetail(order) : null
  }

  async updateStatus(id: string, status: OrderStatus, restoreStock: boolean): Promise<AdminOrderDetail> {
    const order = await this.prisma.$transaction(async (tx) => {
      if (restoreStock) {
        // Devuelve las unidades al inventario antes de marcar el estado, dentro
        // de la misma transacción: o pasan ambas cosas, o ninguna.
        const items = await tx.orderItem.findMany({
          where: { orderId: id },
          select: { productId: true, quantity: true },
        })
        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
        }
      }

      return tx.order.update({
        where: { id },
        data: { status: toPrismaOrderStatus(status) },
        include: INCLUDE,
      })
    })

    return toDetail(order)
  }
}
