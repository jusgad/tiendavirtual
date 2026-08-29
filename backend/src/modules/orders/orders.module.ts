import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'
import { env } from '../../shared/config/env'
import { asyncHandler } from '../../shared/http/asyncHandler'
import { validate } from '../../shared/middlewares/validate'
import { authGuard } from '../../shared/middlewares/auth'
import { optionalAuth } from '../../shared/middlewares/optionalAuth'
// Reutiliza el mismo adaptador de caché de catálogo que usa el módulo
// `catalog` (mismo esquema de clave versionada) para poder invalidarlo cuando
// el checkout/cancelación de un pedido cambia el stock. `orders` solo conoce
// el puerto `CatalogCacheInvalidator` (ver `domain/ports.ts`); la composición
// aquí es la única que sabe qué implementación concreta lo satisface.
import { RedisCatalogCache } from '../catalog/infrastructure/redisCatalogCache'

import {
  HybridCartGateway,
  PrismaCouponGateway,
  PrismaOrderProductGateway,
} from './infrastructure/prismaOrderGateways'
import { PrismaAddressRepository } from './infrastructure/prismaAddressRepository'
import { PrismaOrderRepository } from './infrastructure/prismaOrderRepository'

import { CheckoutUseCase } from './application/checkout.usecase'
import {
  CancelOrderUseCase,
  GetMyOrderUseCase,
  ListMyOrdersUseCase,
  TrackOrderUseCase,
} from './application/orderQueries.usecase'
import {
  CreateAddressUseCase,
  DeleteAddressUseCase,
  ListAddressesUseCase,
  UpdateAddressUseCase,
} from './application/addresses.usecase'

import { AddressController, OrdersController } from './interfaces/http/orders.controllers'
import {
  checkoutSchema,
  createAddressSchema,
  idParamSchema,
  listOrdersQuerySchema,
  trackOrderQuerySchema,
  updateAddressSchema,
} from './interfaces/http/orders.dto'
import { trackingRateLimiter } from '../../shared/middlewares/rateLimit'

export function buildOrdersModule(prisma: PrismaClient, redis: Redis): Router {
  const cart = new HybridCartGateway(prisma, redis)
  const products = new PrismaOrderProductGateway(prisma)
  const coupons = new PrismaCouponGateway(prisma)
  const addresses = new PrismaAddressRepository(prisma)
  const orders = new PrismaOrderRepository(prisma)
  const catalogCache = new RedisCatalogCache(redis)

  const ordersController = new OrdersController(
    new CheckoutUseCase(
      cart,
      products,
      coupons,
      addresses,
      orders,
      { flatRate: env.SHIPPING_FLAT_RATE, freeThreshold: env.FREE_SHIPPING_THRESHOLD },
      catalogCache,
    ),
    new ListMyOrdersUseCase(orders),
    new GetMyOrderUseCase(orders),
    new CancelOrderUseCase(orders, catalogCache),
    new TrackOrderUseCase(orders),
  )

  const addressController = new AddressController(
    new ListAddressesUseCase(addresses),
    new CreateAddressUseCase(addresses),
    new UpdateAddressUseCase(addresses),
    new DeleteAddressUseCase(addresses),
  )

  const router = Router()

  // ---- Pedidos ----
  // El checkout admite invitados (sin cuenta); el resto de rutas de pedidos sigue exigiendo sesión.
  router.post('/orders', optionalAuth, validate({ body: checkoutSchema }), asyncHandler(ordersController.create))
  router.get('/orders', authGuard, validate({ query: listOrdersQuerySchema }), asyncHandler(ordersController.list))
  // OJO: va ANTES de '/orders/:id'. Si se registrara después, el authGuard de
  // esa ruta atendería primero a "track" y devolvería 401 en vez del pedido.
  router.get(
    '/orders/track',
    trackingRateLimiter,
    validate({ query: trackOrderQuerySchema }),
    asyncHandler(ordersController.track),
  )
  router.get('/orders/:id', authGuard, validate({ params: idParamSchema }), asyncHandler(ordersController.get))
  router.post('/orders/:id/cancel', authGuard, validate({ params: idParamSchema }), asyncHandler(ordersController.cancel))

  // ---- Direcciones ----
  router.get('/addresses', authGuard, asyncHandler(addressController.list))
  router.post('/addresses', authGuard, validate({ body: createAddressSchema }), asyncHandler(addressController.create))
  router.patch('/addresses/:id', authGuard, validate({ params: idParamSchema, body: updateAddressSchema }), asyncHandler(addressController.update))
  router.delete('/addresses/:id', authGuard, validate({ params: idParamSchema }), asyncHandler(addressController.remove))

  return router
}
