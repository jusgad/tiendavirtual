import pino from 'pino'
import { env } from '../config/env'

// Logger estructurado. En desarrollo usa pino-pretty para leerlo cómodo;
// en producción emite JSON (ideal para agregadores de logs).
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
  base: undefined, // no incluir pid/hostname por defecto
})
