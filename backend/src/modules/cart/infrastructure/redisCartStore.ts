import type { Redis } from 'ioredis'
import { CartLine, CartStore } from '../domain/ports'

const GUEST_TTL = 60 * 60 * 24 * 7 // 7 días

/** Store del carrito de invitado en Redis, ligado a un token de invitado. */
export class RedisCartStore implements CartStore {
  private readonly key: string

  constructor(
    private readonly redis: Redis,
    guestToken: string,
  ) {
    this.key = `cart:guest:${guestToken}`
  }

  async getItems(): Promise<CartLine[]> {
    const raw = await this.redis.get(this.key)
    return raw ? (JSON.parse(raw) as CartLine[]) : []
  }

  private async save(items: CartLine[]): Promise<void> {
    if (items.length === 0) {
      await this.redis.del(this.key)
    } else {
      await this.redis.set(this.key, JSON.stringify(items), 'EX', GUEST_TTL)
    }
  }

  async setItem(productId: string, quantity: number): Promise<void> {
    const items = await this.getItems()
    const existing = items.find((i) => i.productId === productId)
    if (existing) existing.quantity = quantity
    else items.push({ productId, quantity })
    await this.save(items)
  }

  async removeItem(productId: string): Promise<void> {
    const items = (await this.getItems()).filter((i) => i.productId !== productId)
    await this.save(items)
  }

  async clear(): Promise<void> {
    await this.redis.del(this.key)
  }
}
