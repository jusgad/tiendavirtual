import { OrderStatus, PrismaClient } from '@prisma/client'
import { OrderForPayment, OrderPaymentGateway } from '../domain/ports'

export class PrismaOrderPaymentGateway implements OrderPaymentGateway {
  constructor(private readonly prisma: PrismaClient) {}

  async getForPayment(orderId: string, userId: string | null): Promise<OrderForPayment | null> {
    const o = await this.prisma.order.findFirst({
      where: userId ? { id: orderId, userId } : { id: orderId, userId: null },
      select: { id: true, orderNumber: true, total: true, currency: true, status: true },
    })
    if (!o) return null
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      total: Number(o.total),
      currency: o.currency,
      status: o.status,
    }
  }

  async markPaid(orderId: string): Promise<boolean> {
    // Guarda: solo transiciona si sigue PENDING (idempotente ante webhooks repetidos).
    const res = await this.prisma.order.updateMany({
      where: { id: orderId, status: OrderStatus.PENDING },
      data: { status: OrderStatus.PAID },
    })
    return res.count > 0
  }
}
