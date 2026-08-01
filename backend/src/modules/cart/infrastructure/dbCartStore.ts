import { PrismaClient } from '@prisma/client'
import { CartLine, CartStore } from '../domain/ports'

/** Store del carrito persistente en Postgres, ligado a un usuario. */
export class DbCartStore implements CartStore {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly userId: string,
  ) {}

  private async getOrCreateCartId(): Promise<string> {
    const cart = await this.prisma.cart.upsert({
      where: { userId: this.userId },
      update: {},
      create: { userId: this.userId },
      select: { id: true },
    })
    return cart.id
  }

  async getItems(): Promise<CartLine[]> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId: this.userId },
      select: { items: { select: { productId: true, quantity: true } } },
    })
    return cart?.items ?? []
  }

  async setItem(productId: string, quantity: number): Promise<void> {
    const cartId = await this.getOrCreateCartId()
    await this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId, productId } },
      update: { quantity },
      create: { cartId, productId, quantity },
    })
  }

  async removeItem(productId: string): Promise<void> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId: this.userId },
      select: { id: true },
    })
    if (!cart) return
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } })
  }

  async clear(): Promise<void> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId: this.userId },
      select: { id: true },
    })
    if (!cart) return
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
  }
}
