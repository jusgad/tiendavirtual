import { z } from 'zod'

export const addItemSchema = z.object({
  productId: z.string().uuid('productId inválido'),
  quantity: z.number().int().min(1).default(1),
})

export const updateItemSchema = z.object({
  quantity: z.number().int().min(0, 'La cantidad no puede ser negativa'),
})

export const productIdParamSchema = z.object({
  productId: z.string().uuid('productId inválido'),
})

export const mergeSchema = z.object({
  guestId: z.string().min(1, 'guestId requerido'),
})
