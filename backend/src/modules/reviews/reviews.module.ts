import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { asyncHandler } from '../../shared/http/asyncHandler'
import { validate } from '../../shared/middlewares/validate'
import { authGuard } from '../../shared/middlewares/auth'

import { PrismaReviewRepository } from './infrastructure/prismaReviewRepository'
import { PrismaPurchaseVerificationGateway } from './infrastructure/prismaPurchaseVerificationGateway'
import { CreateReviewUseCase, ListProductReviewsUseCase } from './application/reviewUseCases'
import { ReviewController } from './interfaces/http/reviews.controller'
import { createReviewSchema, listReviewsQuerySchema, productIdParamSchema } from './interfaces/http/reviews.dto'

/** Composición del módulo Reseñas: cablea repos → casos de uso → rutas. */
export function buildReviewsModule(prisma: PrismaClient): Router {
  const reviews = new PrismaReviewRepository(prisma)
  const purchases = new PrismaPurchaseVerificationGateway(prisma)

  const controller = new ReviewController(
    new ListProductReviewsUseCase(reviews),
    new CreateReviewUseCase(reviews, purchases),
  )

  const router = Router()

  router.get(
    '/products/:productId/reviews',
    validate({ params: productIdParamSchema, query: listReviewsQuerySchema }),
    asyncHandler(controller.list),
  )
  router.post(
    '/products/:productId/reviews',
    authGuard,
    validate({ params: productIdParamSchema, body: createReviewSchema }),
    asyncHandler(controller.create),
  )

  return router
}
