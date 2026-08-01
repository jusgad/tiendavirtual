import Redis from 'ioredis'
import { env } from '../config/env'
import { logger } from '../logger/logger'

// Cliente Redis compartido para caché de catálogos y carritos de invitado.
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  // Conexión perezosa: se conecta al primer comando. Evita conexiones colgantes
  // en procesos (p.ej. tests) que nunca usan la caché.
  lazyConnect: true,
})

redis.on('error', (err) => {
  logger.error({ err }, 'Redis error')
})

redis.on('connect', () => {
  logger.info('Redis conectado')
})
