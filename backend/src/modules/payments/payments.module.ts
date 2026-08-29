import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { env } from '../../shared/config/env'
import { asyncHandler } from '../../shared/http/asyncHandler'
import { validate } from '../../shared/middlewares/validate'
import { authGuard } from '../../shared/middlewares/auth'
import { optionalAuth } from '../../shared/middlewares/optionalAuth'

import { PrismaPaymentRepository } from './infrastructure/prismaPaymentRepository'
import { PrismaOrderPaymentGateway } from './infrastructure/prismaOrderPaymentGateway'
import { WompiGateway } from './infrastructure/wompiGateway'
import {
  GetPaymentUseCase,
  HandleWebhookUseCase,
  StartPaymentUseCase,
} from './application/paymentUseCases'
import { PaymentsController } from './interfaces/http/payments.controller'
import { paymentIdParamSchema, startPaymentSchema } from './interfaces/http/payments.dto'

export function buildPaymentsModule(prisma: PrismaClient): Router {
  const gateway = new WompiGateway({
    publicKey: env.WOMPI_PUBLIC_KEY,
    integritySecret: env.WOMPI_INTEGRITY_SECRET,
    eventsSecret: env.WOMPI_EVENTS_SECRET,
    redirectUrl: env.WOMPI_REDIRECT_URL,
  })

  const payments = new PrismaPaymentRepository(prisma)
  const orders = new PrismaOrderPaymentGateway(prisma)

  const controller = new PaymentsController(
    new StartPaymentUseCase(orders, payments, gateway),
    new HandleWebhookUseCase(payments, orders, gateway),
    new GetPaymentUseCase(payments),
  )

  const router = Router()
  // Admite invitados: solo funciona si el pedido también es de invitado (ver getForPayment).
  router.post('/', optionalAuth, validate({ body: startPaymentSchema }), asyncHandler(controller.create))
  router.get('/:id', authGuard, validate({ params: paymentIdParamSchema }), asyncHandler(controller.get))
  // Webhook de Wompi: sin auth de usuario, se verifica por el checksum del evento.
  router.post('/webhook/wompi', asyncHandler(controller.handleWebhook))

  return router
}
