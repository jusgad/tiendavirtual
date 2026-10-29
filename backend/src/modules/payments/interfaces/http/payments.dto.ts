import { z } from 'zod'

/**
 * Iniciar un pago solo necesita el pedido. Los datos del medio de pago
 * (tarjeta, cuenta, celular) los captura Mercado Pago en su propio sitio:
 * este backend ya NO los recibe, a propósito — es la razón de usar una
 * pasarela alojada.
 */
export const startPaymentSchema = z.object({
  orderId: z.string().uuid(),
})

export const paymentIdParamSchema = z.object({ id: z.string().uuid('id inválido') })
