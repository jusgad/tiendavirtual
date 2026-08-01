import { OrderStatus, PrismaClient } from '@prisma/client'
import { PurchaseVerificationGateway } from '../domain/ports'

export class PrismaPurchaseVerificationGateway implements PurchaseVerificationGateway {
  constructor(private readonly prisma: PrismaClient) {}

  async findDeliveredOrderId(userId: string, productId: string): Promise<string | null> {
    const order = await this.prisma.order.findFirst({
      where: { userId, status: OrderStatus.DELIVERED, items: { some: { productId } } },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    })
    return order?.id ?? null
  }
}
