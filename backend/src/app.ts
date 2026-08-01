import express, { Express } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import pinoHttp from 'pino-http'
import swaggerUi from 'swagger-ui-express'
import { PrismaClient } from '@prisma/client'
import { env } from './shared/config/env'
import { logger } from './shared/logger/logger'
import { openApiDocument } from './shared/docs/openapi'
import { errorHandler, notFoundHandler } from './shared/errors/errorHandler'
import { globalRateLimiter } from './shared/middlewares/rateLimit'
import { prisma as defaultPrisma } from './shared/database/prisma'
import { buildApiRouter } from './routes'

/**
 * Ensambla la aplicación Express. Recibe el PrismaClient por parámetro para
 * poder inyectar una base de datos de prueba en los tests de integración.
 */
export function createApp(prisma: PrismaClient = defaultPrisma): Express {
  const app = express()

  // Confía solo en los N saltos de proxy configurados (0 = ninguno). Necesario
  // para que el rate limiting y req.ip funcionen bien detrás de un balanceador,
  // sin abrir la puerta a spoofing de X-Forwarded-For.
  app.set('trust proxy', env.TRUST_PROXY)

  app.use(helmet())

  const isWildcardOrigin = env.CORS_ORIGIN === '*'
  app.use(
    cors({
      origin: isWildcardOrigin ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      // Solo se envían credenciales cuando hay una allowlist explícita de orígenes;
      // con "*" se desactivan (reflejar cualquier origen con credenciales es inseguro).
      credentials: !isWildcardOrigin,
    }),
  )
  // Límite de tamaño de body para mitigar DoS por payloads grandes.
  app.use(express.json({ limit: '100kb' }))
  app.use(globalRateLimiter)
  if (env.NODE_ENV !== 'test') {
    app.use(pinoHttp({ logger }))
  }

  // Health check para orquestadores/monitoreo.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // Documentación Swagger.
  app.use(`${env.API_PREFIX}/docs`, swaggerUi.serve, swaggerUi.setup(openApiDocument))

  // API.
  app.use(env.API_PREFIX, buildApiRouter(prisma))

  // 404 + manejo central de errores (siempre al final).
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
