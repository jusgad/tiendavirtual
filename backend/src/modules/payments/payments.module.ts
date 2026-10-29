import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { env } from '../../shared/config/env'
import { asyncHandler } from '../../shared/http/asyncHandler'
import { validate } from '../../shared/middlewares/validate'
import { authGuard } from '../../shared/middlewares/auth'
import { optionalAuth } from '../../shared/middlewares/optionalAuth'

import { PrismaPaymentRepository } from './infrastructure/prismaPaymentRepository'
import { PrismaOrderPaymentGateway } from './infrastructure/prismaOrderPaymentGateway'
import { MercadoPagoGateway } from './infrastructure/mercadoPagoGateway'
import {
  GetPaymentUseCase,
  HandleWebhookUseCase,
  StartPaymentUseCase,
} from './application/paymentUseCases'
import { PaymentsController } from './interfaces/http/payments.controller'
import { paymentIdParamSchema, startPaymentSchema } from './interfaces/http/payments.dto'
import { buildEmailNotifier } from '../../shared/email/buildEmailNotifier'

export function buildPaymentsModule(prisma: PrismaClient): Router {
  const gateway = new MercadoPagoGateway({
    accessToken: env.MERCADO_PAGO_ACCESS_TOKEN,
    publicKey: env.MERCADO_PAGO_PUBLIC_KEY,
    webhookSecret: env.MERCADO_PAGO_WEBHOOK_SECRET,
    notificationUrl: env.MERCADO_PAGO_NOTIFICATION_URL,
    // Al terminar en Mercado Pago, la clienta vuelve al seguimiento del
    // pedido: es la página que ya sabe mostrar en qué quedó, y funciona
    // igual para invitadas que para quien tiene cuenta.
    backUrl: env.MERCADO_PAGO_BACK_URL ?? `${env.FRONTEND_URL}/track.html`,
    statementDescriptor: env.MERCADO_PAGO_STATEMENT_DESCRIPTOR,
    apiBaseUrl: env.MERCADO_PAGO_API_URL,
  })

  const payments = new PrismaPaymentRepository(prisma)
  const orders = new PrismaOrderPaymentGateway(prisma)

  const controller = new PaymentsController(
    new StartPaymentUseCase(orders, payments, gateway),
    new HandleWebhookUseCase(payments, orders, gateway, buildEmailNotifier()),
    new GetPaymentUseCase(payments),
  )

  const router = Router()
  // Admite invitados: solo funciona si el pedido también es de invitado (ver getForPayment).
  router.post('/', optionalAuth, validate({ body: startPaymentSchema }), asyncHandler(controller.create))
  router.get('/:id', authGuard, validate({ params: paymentIdParamSchema }), asyncHandler(controller.get))
  // Webhook de Mercado Pago: sin auth de usuario, se verifica por la firma
  // HMAC de la cabecera `x-signature`.
  router.post('/webhook/mercadopago', asyncHandler(controller.handleWebhook))

  return router
}
