import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'
import { asyncHandler } from '../../shared/http/asyncHandler'
import { validate } from '../../shared/middlewares/validate'
import { authGuard } from '../../shared/middlewares/auth'
import { optionalAuth } from '../../shared/middlewares/optionalAuth'

import { PrismaCartProductGateway } from './infrastructure/prismaCartProductGateway'
import { DbCartStore } from './infrastructure/dbCartStore'
import { RedisCartStore } from './infrastructure/redisCartStore'
import {
  AddItemUseCase,
  ClearCartUseCase,
  GetCartUseCase,
  MergeGuestCartUseCase,
  RemoveItemUseCase,
  UpdateItemUseCase,
} from './application/cartUseCases'
import { CartController } from './interfaces/http/cart.controller'
import {
  addItemSchema,
  mergeSchema,
  productIdParamSchema,
  updateItemSchema,
} from './interfaces/http/cart.dto'

export function buildCartModule(prisma: PrismaClient, redis: Redis): Router {
  const products = new PrismaCartProductGateway(prisma)
  const stores = {
    userStore: (userId: string) => new DbCartStore(prisma, userId),
    guestStore: (token: string) => new RedisCartStore(redis, token),
  }

  const controller = new CartController(
    stores,
    new GetCartUseCase(products),
    new AddItemUseCase(products),
    new UpdateItemUseCase(products),
    new RemoveItemUseCase(products),
    new ClearCartUseCase(),
    new MergeGuestCartUseCase(products),
  )

  const router = Router()
  router.get('/', optionalAuth, asyncHandler(controller.get))
  router.post('/items', optionalAuth, validate({ body: addItemSchema }), asyncHandler(controller.add))
  router.patch(
    '/items/:productId',
    optionalAuth,
    validate({ params: productIdParamSchema, body: updateItemSchema }),
    asyncHandler(controller.update),
  )
  router.delete(
    '/items/:productId',
    optionalAuth,
    validate({ params: productIdParamSchema }),
    asyncHandler(controller.remove),
  )
  router.delete('/', optionalAuth, asyncHandler(controller.clear))
  router.post('/merge', authGuard, validate({ body: mergeSchema }), asyncHandler(controller.merge))

  return router
}
