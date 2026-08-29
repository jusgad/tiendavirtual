import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { buildAuthModule } from './modules/auth/auth.module'
import { buildCatalogModule } from './modules/catalog/catalog.module'
import { buildCartModule } from './modules/cart/cart.module'
import { buildOrdersModule } from './modules/orders/orders.module'
import { buildPaymentsModule } from './modules/payments/payments.module'
import { buildCouponsModule } from './modules/coupons/coupons.module'
import { buildReviewsModule } from './modules/reviews/reviews.module'
import { buildAdminModule } from './modules/admin/admin.module'
import { redis } from './shared/cache/redis'

// Registro de documentación OpenAPI por módulo (efecto de importación).
import './modules/auth/interfaces/http/auth.openapi'
import './modules/catalog/interfaces/http/catalog.openapi'
import './modules/cart/interfaces/http/cart.openapi'
import './modules/orders/interfaces/http/orders.openapi'
import './modules/payments/interfaces/http/payments.openapi'
import './modules/coupons/interfaces/http/coupons.openapi'
import './modules/reviews/interfaces/http/reviews.openapi'
import './modules/admin/interfaces/http/admin.openapi'

/** Router agregado de la API. Se irán montando aquí los módulos por dominio. */
export function buildApiRouter(prisma: PrismaClient): Router {
  const router = Router()

  router.use('/auth', buildAuthModule(prisma))
  router.use('/', buildCatalogModule(prisma, redis)) // /products, /categories, /brands
  router.use('/cart', buildCartModule(prisma, redis))
  router.use('/', buildOrdersModule(prisma, redis)) // /orders, /addresses
  router.use('/payments', buildPaymentsModule(prisma))
  router.use('/coupons', buildCouponsModule(prisma))
  router.use('/', buildReviewsModule(prisma)) // /products/:productId/reviews
  router.use('/admin', buildAdminModule(prisma, redis))

  return router
}
