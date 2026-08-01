import type { Redis } from 'ioredis'
import { CatalogCache } from '../domain/ports'
import { logger } from '../../../shared/logger/logger'

const VERSION_KEY = 'catalog:version'

// Implementación del puerto CatalogCache con Redis usando **versionado de
// namespace**: cada clave se guarda bajo `catalog:v{N}:...`. Para invalidar todo
// se incrementa N (una sola operación O(1), sin recorrer el keyspace con KEYS);
// las claves de versiones viejas caducan solas por su TTL.
//
// Es tolerante a fallos: si Redis no está disponible, degrada a "sin caché".
export class RedisCatalogCache implements CatalogCache {
  constructor(private readonly redis: Redis) {}

  private async currentVersion(): Promise<string> {
    const v = await this.redis.get(VERSION_KEY)
    return v ?? '1'
  }

  private async keyFor(key: string): Promise<string> {
    return `catalog:v${await this.currentVersion()}:${key}`
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(await this.keyFor(key))
      return raw ? (JSON.parse(raw) as T) : null
    } catch (err) {
      logger.warn({ err }, 'Catalog cache get falló; se ignora')
      return null
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(await this.keyFor(key), JSON.stringify(value), 'EX', ttlSeconds)
    } catch (err) {
      logger.warn({ err }, 'Catalog cache set falló; se ignora')
    }
  }

  async invalidate(): Promise<void> {
    try {
      // O(1): sube la versión; las claves viejas dejan de leerse y expiran por TTL.
      await this.redis.incr(VERSION_KEY)
    } catch (err) {
      logger.warn({ err }, 'Catalog cache invalidate falló; se ignora')
    }
  }
}
