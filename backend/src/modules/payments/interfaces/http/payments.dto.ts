import { z } from 'zod'

/**
 * Iniciar un pago solo necesita el pedido. Los datos del medio de pago (tarjeta,
 * celular) los captura el widget de Wompi en el navegador: este backend ya NO
 * los recibe, a propósito — es la razón del cambio a Wompi.
 */
export const startPaymentSchema = z.object({
  orderId: z.string().uuid(),
})

export const paymentIdParamSchema = z.object({ id: z.string().uuid('id inválido') })
