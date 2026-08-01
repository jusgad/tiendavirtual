import { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'
import { CartGateway, CartOwner, CouponGateway, OrderProductGateway, OrderProductInfo } from '../domain/ports'
import { CouponData } from '../domain/pricing'
import { toDomainCouponType } from './couponTypeMapper'

export class PrismaOrderProductGateway implements OrderProductGateway {
  constructor(private readonly prisma: PrismaClient) {}
  async findManyByIds(ids: string[]): Promise<OrderProductInfo[]> {
    if (ids.length === 0) return []
    const rows = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, price: true, stock: true, isActive: true },
    })
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      stock: p.stock,
      isActive: p.isActive,
    }))
  }
}

// Mismo esquema de clave que RedisCartStore (módulo cart) para que el carrito
// que el invitado arma antes del checkout sea el mismo que se lee aquí.
const guestCartKey = (guestId: string) => `cart:guest:${guestId}`

/** Lee/limpia el carrito del dueño del pedido: DB si es usuario, Redis si es invitado. */
export class HybridCartGateway implements CartGateway {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  async getItems(owner: CartOwner): Promise<{ productId: string; quantity: number }[]> {
    if (owner.type === 'user') {
      const cart = await this.prisma.cart.findUnique({
        where: { userId: owner.id },
        select: { items: { select: { productId: true, quantity: true } } },
      })
      return cart?.items ?? []
    }
    const raw = await this.redis.get(guestCartKey(owner.id))
    return raw ? JSON.parse(raw) : []
  }

  async clear(owner: CartOwner): Promise<void> {
    if (owner.type === 'user') {
      const cart = await this.prisma.cart.findUnique({ where: { userId: owner.id }, select: { id: true } })
      if (cart) await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
      return
    }
    await this.redis.del(guestCartKey(owner.id))
  }
}

export class PrismaCouponGateway implements CouponGateway {
  constructor(private readonly prisma: PrismaClient) {}

  async findByCode(code: string): Promise<CouponData | null> {
    const c = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } })
    if (!c) return null
    return {
      id: c.id,
      code: c.code,
      type: toDomainCouponType(c.type),
      value: Number(c.value),
      minPurchase: c.minPurchase != null ? Number(c.minPurchase) : null,
      maxUses: c.maxUses,
      usedCount: c.usedCount,
      perUserLimit: c.perUserLimit,
      startsAt: c.startsAt,
      endsAt: c.endsAt,
      isActive: c.isActive,
    }
  }

  countUserRedemptions(couponId: string, userId: string): Promise<number> {
    return this.prisma.couponRedemption.count({ where: { couponId, userId } })
  }
}
