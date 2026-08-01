import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { env } from '../../shared/config/env'
import { asyncHandler } from '../../shared/http/asyncHandler'
import { validate } from '../../shared/middlewares/validate'
import { authGuard } from '../../shared/middlewares/auth'
import { optionalAuth } from '../../shared/middlewares/optionalAuth'

import { PrismaPaymentRepository } from './infrastructure/prismaPaymentRepository'
import { PrismaOrderPaymentGateway } from './infrastructure/prismaOrderPaymentGateway'
import {
  CreditCardProvider,
  DaviplataProvider,
  NequiProvider,
  ProviderRegistry,
} from './infrastructure/providers'
import {
  GetPaymentUseCase,
  HandleWebhookUseCase,
  InitiatePaymentUseCase,
} from './application/paymentUseCases'
import { PaymentsController } from './interfaces/http/payments.controller'
import {
  initiatePaymentSchema,
  paymentIdParamSchema,
  webhookProviderParamSchema,
} from './interfaces/http/payments.dto'

export function buildPaymentsModule(prisma: PrismaClient): Router {
  const secret = env.PAYMENTS_WEBHOOK_SECRET
  const registry = new ProviderRegistry([
    new NequiProvider(secret),
    new DaviplataProvider(secret),
    new CreditCardProvider(secret),
  ])

  const payments = new PrismaPaymentRepository(prisma)
  const orders = new PrismaOrderPaymentGateway(prisma)

  const controller = new PaymentsController(
    new InitiatePaymentUseCase(orders, payments, registry),
    new HandleWebhookUseCase(payments, orders, registry),
    new GetPaymentUseCase(payments),
  )

  const router = Router()
  // Admite iniciar pago sin sesión: solo funciona si el pedido también es de invitado (ver getForPayment).
  router.post('/', optionalAuth, validate({ body: initiatePaymentSchema }), asyncHandler(controller.create))
  router.get('/:id', authGuard, validate({ params: paymentIdParamSchema }), asyncHandler(controller.get))
  // Webhook: sin auth de usuario; se verifica por firma HMAC (header x-signature).
  router.post(
    '/webhook/:provider',
    validate({ params: webhookProviderParamSchema }),
    asyncHandler(controller.handleWebhook),
  )

  return router
}
