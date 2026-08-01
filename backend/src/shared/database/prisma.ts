import { PrismaClient } from '@prisma/client'
import { env } from '../config/env'

// Singleton de PrismaClient. En desarrollo se reutiliza la instancia entre
// recargas de tsx para no agotar el pool de conexiones.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
