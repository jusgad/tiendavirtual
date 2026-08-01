import { createApp } from './app'
import { env } from './shared/config/env'
import { logger } from './shared/logger/logger'
import { prisma } from './shared/database/prisma'
import { redis } from './shared/cache/redis'

function bootstrap(): void {
  const app = createApp()

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 API PomAss escuchando en http://localhost:${env.PORT}${env.API_PREFIX}`)
    logger.info(`📚 Swagger en http://localhost:${env.PORT}${env.API_PREFIX}/docs`)
  })

  const shutdown = async (signal: string) => {
    logger.info(`${signal} recibido. Cerrando conexiones...`)
    server.close()
    await prisma.$disconnect()
    redis.disconnect()
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

bootstrap()
