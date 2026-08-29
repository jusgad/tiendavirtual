import rateLimit, { Options } from 'express-rate-limit'
import { env } from '../config/env'

// Se desactiva en tests para no introducir flakiness por 429.
const skip = () => env.NODE_ENV === 'test'

const jsonHandler: Options['handler'] = (_req, res) => {
  res.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Demasiadas solicitudes, intenta de nuevo más tarde' },
  })
}

const base = {
  standardHeaders: true as const,
  legacyHeaders: false as const,
  handler: jsonHandler,
  skip,
}

/** Límite general para toda la API (protección básica contra abuso). */
export const globalRateLimiter = rateLimit({ ...base, windowMs: 60_000, limit: 300 })

/** Límite estricto para endpoints sensibles de autenticación (anti fuerza bruta). */
export const authRateLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 20 })

/**
 * Límite para el seguimiento público de pedidos. Es un endpoint sin sesión que
 * responde a "nº de pedido + correo": sin este tope, alguien podría probar
 * combinaciones hasta acertar con el pedido de otra persona.
 */
export const trackingRateLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 30 })
