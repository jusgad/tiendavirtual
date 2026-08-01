import { z } from 'zod'
import { PaymentMethod } from '@prisma/client'

const cardSchema = z.object({
  number: z.string().min(13).max(23),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(2024).max(2100),
  cvv: z.string().min(3).max(4),
  holder: z.string().optional(),
})

export const initiatePaymentSchema = z
  .object({
    orderId: z.string().uuid(),
    method: z.nativeEnum(PaymentMethod),
    phone: z.string().optional(),
    card: cardSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.method === PaymentMethod.CREDIT_CARD && !data.card) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Se requieren los datos de la tarjeta', path: ['card'] })
    }
    if (
      (data.method === PaymentMethod.NEQUI || data.method === PaymentMethod.DAVIPLATA) &&
      !data.phone
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Se requiere el número de celular', path: ['phone'] })
    }
  })

export const paymentIdParamSchema = z.object({ id: z.string().uuid('id inválido') })

export const webhookProviderParamSchema = z.object({
  provider: z.enum(['nequi', 'daviplata', 'card']),
})
