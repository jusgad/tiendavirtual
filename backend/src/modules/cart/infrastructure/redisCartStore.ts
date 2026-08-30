import type { Redis } from 'ioredis'
import { ServiceUnavailableError } from '../../../shared/errors/AppError'
import { logger } from '../../../shared/logger/logger'
import { CartLine, CartStore } from '../domain/ports'

const GUEST_TTL = 60 * 60 * 24 * 7 // 7 días

/**
 * Store del carrito de invitado en Redis, ligado a un token de invitado.
 *
 * A diferencia del caché de catálogo, aquí NO se puede degradar a «seguir sin
 * Redis»: el carrito es el dato, no una copia acelerada. Lo que sí se hace es
 * fallar con un mensaje que el cliente entienda y que lo invite a reintentar,
 * en vez del «Error interno del servidor» genérico que salía antes.
 *
 * El alcance del corte queda acotado al carrito: el catálogo y el seguimiento
 * leen de Postgres y siguen funcionando.
 */
export class RedisCartStore implements CartStore {
  private readonly key: string

  constructor(
    private readonly redis: Redis,
    guestToken: string,
  ) {
    this.key = `cart:guest:${guestToken}`
  }

  /** Traduce cualquier fallo de Redis a un 503 con mensaje para el comprador. */
  private async conRedis<T>(operacion: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (err) {
      logger.error({ err, operacion }, 'Carrito de invitado: Redis no responde')
      throw new ServiceUnavailableError(
        'El carrito no está disponible en este momento. Vuelve a intentarlo en unos segundos.',
      )
    }
  }

  async getItems(): Promise<CartLine[]> {
    const raw = await this.conRedis('get', () => this.redis.get(this.key))
    return raw ? (JSON.parse(raw) as CartLine[]) : []
  }

  private async save(items: CartLine[]): Promise<void> {
    if (items.length === 0) {
      await this.conRedis('del', () => this.redis.del(this.key))
    } else {
      await this.conRedis('set', () => this.redis.set(this.key, JSON.stringify(items), 'EX', GUEST_TTL))
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
    await this.conRedis('del', () => this.redis.del(this.key))
  }
}
