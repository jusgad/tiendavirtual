import { Prisma, PrismaClient } from '@prisma/client'
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError'
import {
  OrderRepository,
  OrderSummary,
  OrderView,
  Paginated,
  PlaceOrderData,
} from '../domain/ports'
import { OrderStatus } from '../domain/orderStatus'
import { toDomainOrderStatus, toPrismaOrderStatus } from './orderStatusMapper'

type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>

function toOrderView(o: OrderWithItems): OrderView {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: toDomainOrderStatus(o.status),
    subtotal: Number(o.subtotal),
    discountTotal: Number(o.discountTotal),
    shippingTotal: Number(o.shippingTotal),
    total: Number(o.total),
    currency: o.currency,
    discreetPackaging: o.discreetPackaging,
    items: o.items.map((it) => ({
      productId: it.productId,
      productName: it.productName,
      unitPrice: Number(it.unitPrice),
      quantity: it.quantity,
      lineTotal: Number(it.lineTotal),
    })),
    shipping: {
      fullName: o.shipFullName ?? '',
      phone: o.shipPhone ?? '',
      line1: o.shipLine1 ?? '',
      line2: o.shipLine2,
      city: o.shipCity ?? '',
      department: o.shipDepartment ?? '',
      postalCode: o.shipPostalCode,
    },
    createdAt: o.createdAt,
  }
}

const CANCELLABLE: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.PAID]

export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async place(data: PlaceOrderData): Promise<OrderView> {
    const order = await this.prisma.$transaction(async (tx) => {
      // 1) Descuento de stock atómico y a prueba de concurrencia:
      //    solo decrementa si hay stock suficiente (guarda en el WHERE).
      for (const item of data.items) {
        const res = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        })
        if (res.count === 0) {
          throw new ConflictError(`Stock insuficiente para "${item.productName}"`)
        }
      }

      // 2) Crea el pedido con snapshots de ítems y dirección.
      const created = await tx.order.create({
        data: {
          orderNumber: data.orderNumber,
          userId: data.userId,
          guestEmail: data.guestEmail,
          addressId: data.addressId,
          status: toPrismaOrderStatus(OrderStatus.PENDING),
          subtotal: data.subtotal,
          discountTotal: data.discountTotal,
          shippingTotal: data.shippingTotal,
          total: data.total,
          couponId: data.coupon?.id ?? null,
          discreetPackaging: data.discreetPackaging,
          shipFullName: data.address.fullName,
          shipPhone: data.address.phone,
          shipLine1: data.address.line1,
          shipLine2: data.address.line2,
          shipCity: data.address.city,
          shipDepartment: data.address.department,
          shipPostalCode: data.address.postalCode,
          placedAt: new Date(),
          items: {
            create: data.items.map((it) => ({
              productId: it.productId,
              productName: it.productName,
              unitPrice: it.unitPrice,
              quantity: it.quantity,
              lineTotal: it.lineTotal,
            })),
          },
        },
        include: { items: true },
      })

      // 3) Canje del cupón (si aplica), de forma atómica dentro de la transacción.
      if (data.coupon) {
        const { id, maxUses, perUserLimit } = data.coupon

        // perUserLimit: se recuenta dentro de la transacción. Solo aplica a
        // usuarios registrados; los invitados no tienen identidad persistente.
        if (perUserLimit != null && data.userId) {
          const uses = await tx.couponRedemption.count({
            where: { couponId: id, userId: data.userId },
          })
          if (uses >= perUserLimit) {
            throw new ConflictError('Ya usaste este cupón el máximo de veces permitido')
          }
        }

        // maxUses: incremento condicional (solo si aún hay cupos). Si no aplicó,
        // otro checkout concurrente consumió el último uso -> se aborta la tx.
        if (maxUses != null) {
          const res = await tx.coupon.updateMany({
            where: { id, usedCount: { lt: maxUses } },
            data: { usedCount: { increment: 1 } },
          })
          if (res.count === 0) throw new ConflictError('El cupón alcanzó su límite de usos')
        } else {
          await tx.coupon.update({ where: { id }, data: { usedCount: { increment: 1 } } })
        }

        if (data.userId) {
          await tx.couponRedemption.create({
            data: { couponId: id, userId: data.userId, orderId: created.id },
          })
        }
      }

      // 4) Vacía el carrito del usuario (el de invitado vive en Redis, se
      // limpia aparte fuera de esta transacción, ver CheckoutUseCase).
      if (data.userId) {
        const cart = await tx.cart.findUnique({ where: { userId: data.userId }, select: { id: true } })
        if (cart) await tx.cartItem.deleteMany({ where: { cartId: cart.id } })
      }

      return created
    })

    return toOrderView(order)
  }

  async listByUser(userId: string, page: number, pageSize: number): Promise<Paginated<OrderSummary>> {
    const skip = (page - 1) * pageSize
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: { id: true, orderNumber: true, status: true, total: true, createdAt: true },
      }),
      this.prisma.order.count({ where: { userId } }),
    ])
    return {
      items: rows.map((r) => ({
        id: r.id,
        orderNumber: r.orderNumber,
        status: toDomainOrderStatus(r.status),
        total: Number(r.total),
        createdAt: r.createdAt,
      })),
      total,
      page,
      pageSize,
    }
  }

  async findByIdForUser(id: string, userId: string): Promise<OrderView | null> {
    const order = await this.prisma.order.findFirst({ where: { id, userId }, include: { items: true } })
    return order ? toOrderView(order) : null
  }

  async cancel(id: string, userId: string): Promise<OrderView> {
    const order = await this.prisma.$transaction(async (tx) => {
      const found = await tx.order.findFirst({ where: { id, userId }, include: { items: true } })
      if (!found) throw new NotFoundError('Pedido no encontrado')
      const status = toDomainOrderStatus(found.status)
      if (!CANCELLABLE.includes(status)) {
        throw new ConflictError(`No se puede cancelar un pedido en estado ${status}`)
      }

      // Restaura el stock de cada ítem.
      for (const item of found.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }

      return tx.order.update({
        where: { id },
        data: { status: toPrismaOrderStatus(OrderStatus.CANCELLED) },
        include: { items: true },
      })
    })

    return toOrderView(order)
  }
}
