import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'
import { asyncHandler } from '../../shared/http/asyncHandler'
import { validate } from '../../shared/middlewares/validate'
import { authGuard, roleGuard } from '../../shared/middlewares/auth'
// Reutiliza el adaptador de caché del módulo `catalog` (mismo esquema de clave
// versionada) para invalidarlo cuando cancelar un pedido devuelve stock.
// `admin` solo conoce el puerto `CatalogCacheInvalidator`.
import { RedisCatalogCache } from '../catalog/infrastructure/redisCatalogCache'

import { PrismaAdminReportsRepository } from './infrastructure/prismaAdminReportsRepository'
import { PrismaAdminOrderRepository } from './infrastructure/prismaAdminOrderRepository'
import { GetOrdersByStatusUseCase, GetSalesReportUseCase, GetTopProductsUseCase } from './application/reportUseCases'
import {
  GetOrderUseCase,
  ListOrdersUseCase,
  UpdateOrderStatusUseCase,
} from './application/orderAdminUseCases'
import { AdminOrdersController, AdminReportsController } from './interfaces/http/admin.controller'
import {
  listOrdersQuerySchema,
  orderIdParamSchema,
  salesReportQuerySchema,
  topProductsQuerySchema,
  updateOrderStatusSchema,
} from './interfaces/http/admin.dto'

// Todo el panel admin requiere rol ADMIN.
const adminOnly = [authGuard, roleGuard('ADMIN')]

/** Composición del módulo Admin: cablea repos → casos de uso → rutas. */
export function buildAdminModule(prisma: PrismaClient, redis: Redis): Router {
  const reports = new PrismaAdminReportsRepository(prisma)
  const orders = new PrismaAdminOrderRepository(prisma)
  const catalogCache = new RedisCatalogCache(redis)

  const reportsController = new AdminReportsController(
    new GetSalesReportUseCase(reports),
    new GetTopProductsUseCase(reports),
    new GetOrdersByStatusUseCase(reports),
  )

  const ordersController = new AdminOrdersController(
    new ListOrdersUseCase(orders),
    new GetOrderUseCase(orders),
    new UpdateOrderStatusUseCase(orders, catalogCache),
  )

  const router = Router()

  // ---- Reportes ----
  router.get(
    '/reports/sales',
    ...adminOnly,
    validate({ query: salesReportQuerySchema }),
    asyncHandler(reportsController.sales),
  )
  router.get(
    '/reports/top-products',
    ...adminOnly,
    validate({ query: topProductsQuerySchema }),
    asyncHandler(reportsController.topProducts),
  )
  router.get('/reports/orders-by-status', ...adminOnly, asyncHandler(reportsController.ordersByStatus))

  // ---- Gestión de pedidos ----
  router.get(
    '/orders',
    ...adminOnly,
    validate({ query: listOrdersQuerySchema }),
    asyncHandler(ordersController.list),
  )
  router.get(
    '/orders/:id',
    ...adminOnly,
    validate({ params: orderIdParamSchema }),
    asyncHandler(ordersController.get),
  )
  router.patch(
    '/orders/:id/status',
    ...adminOnly,
    validate({ params: orderIdParamSchema, body: updateOrderStatusSchema }),
    asyncHandler(ordersController.updateOrderStatus),
  )

  return router
}
