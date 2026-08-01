import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { asyncHandler } from '../../shared/http/asyncHandler'
import { validate } from '../../shared/middlewares/validate'
import { authGuard, roleGuard } from '../../shared/middlewares/auth'

import { PrismaAdminReportsRepository } from './infrastructure/prismaAdminReportsRepository'
import { GetOrdersByStatusUseCase, GetSalesReportUseCase, GetTopProductsUseCase } from './application/reportUseCases'
import { AdminReportsController } from './interfaces/http/admin.controller'
import { salesReportQuerySchema, topProductsQuerySchema } from './interfaces/http/admin.dto'

// Todo el panel admin requiere rol ADMIN.
const adminOnly = [authGuard, roleGuard('ADMIN')]

/** Composición del módulo Admin: cablea repo de reportes → casos de uso → rutas. */
export function buildAdminModule(prisma: PrismaClient): Router {
  const reports = new PrismaAdminReportsRepository(prisma)

  const controller = new AdminReportsController(
    new GetSalesReportUseCase(reports),
    new GetTopProductsUseCase(reports),
    new GetOrdersByStatusUseCase(reports),
  )

  const router = Router()

  router.get(
    '/reports/sales',
    ...adminOnly,
    validate({ query: salesReportQuerySchema }),
    asyncHandler(controller.sales),
  )
  router.get(
    '/reports/top-products',
    ...adminOnly,
    validate({ query: topProductsQuerySchema }),
    asyncHandler(controller.topProducts),
  )
  router.get('/reports/orders-by-status', ...adminOnly, asyncHandler(controller.ordersByStatus))

  return router
}
