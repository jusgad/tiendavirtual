import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { asyncHandler } from '../../shared/http/asyncHandler'
import { validate } from '../../shared/middlewares/validate'
import { authGuard, roleGuard } from '../../shared/middlewares/auth'

import { PrismaCouponRepository } from './infrastructure/prismaCouponRepository'
import {
  CreateCouponUseCase,
  GetCouponUseCase,
  ListCouponsUseCase,
  UpdateCouponUseCase,
} from './application/couponUseCases'
import { CouponController } from './interfaces/http/coupons.controller'
import { createCouponSchema, idParamSchema, updateCouponSchema } from './interfaces/http/coupons.dto'

// Cupones son de gestión interna: todas las rutas requieren admin.
const adminOnly = [authGuard, roleGuard('ADMIN')]

/** Composición del módulo Cupones: cablea repo → casos de uso → rutas. */
export function buildCouponsModule(prisma: PrismaClient): Router {
  const coupons = new PrismaCouponRepository(prisma)

  const controller = new CouponController(
    new ListCouponsUseCase(coupons),
    new GetCouponUseCase(coupons),
    new CreateCouponUseCase(coupons),
    new UpdateCouponUseCase(coupons),
  )

  const router = Router()

  router.get('/', ...adminOnly, asyncHandler(controller.list))
  router.get('/:id', ...adminOnly, validate({ params: idParamSchema }), asyncHandler(controller.get))
  router.post('/', ...adminOnly, validate({ body: createCouponSchema }), asyncHandler(controller.create))
  router.patch(
    '/:id',
    ...adminOnly,
    validate({ params: idParamSchema, body: updateCouponSchema }),
    asyncHandler(controller.update),
  )

  return router
}
