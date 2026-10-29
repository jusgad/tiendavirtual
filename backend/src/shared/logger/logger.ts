import pino from 'pino'
import { env } from '../config/env'

/**
 * Transporte legible para desarrollo, si está disponible.
 *
 * `pino-pretty` es una dependencia de desarrollo, y hay un caso real en que no
 * está pero `NODE_ENV` sigue siendo `development`: la imagen de Docker poda las
 * dev deps y aun así corre en modo desarrollo a propósito, para no activar el
 * endurecimiento de producción de `env.ts`. Pedir un transporte que no existe
 * tumbaba el proceso al arrancar.
 *
 * Que los logs salgan en JSON en vez de en colores no es motivo para no
 * arrancar, así que se comprueba antes y se sigue sin él.
 */
function transporteDeDesarrollo(): pino.TransportSingleOptions | undefined {
  if (env.NODE_ENV !== 'development') return undefined
  try {
    require.resolve('pino-pretty')
  } catch {
    return undefined
  }
  return { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
}

// Logger estructurado. En desarrollo usa pino-pretty para leerlo cómodo;
// en producción emite JSON (ideal para agregadores de logs).
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  transport: transporteDeDesarrollo(),
  base: undefined, // no incluir pid/hostname por defecto
})
