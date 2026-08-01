import { z } from 'zod'

export const addressBodySchema = z.object({
  fullName: z.string().min(1).max(120),
  phone: z.string().min(7).max(20),
  line1: z.string().min(1).max(180),
  line2: z.string().max(180).optional().nullable(),
  city: z.string().min(1).max(80),
  department: z.string().min(1).max(80), // departamento (Colombia)
  postalCode: z.string().max(20).optional().nullable(),
})

export const createAddressSchema = addressBodySchema.extend({
  isDefault: z.boolean().optional(),
})

export const updateAddressSchema = addressBodySchema
  .extend({ isDefault: z.boolean() })
  .partial()

export const checkoutSchema = z
  .object({
    addressId: z.string().uuid().optional(),
    shippingAddress: addressBodySchema.optional(),
    couponCode: z.string().min(1).max(40).optional(),
    discreetPackaging: z.boolean().default(false),
    guestEmail: z.string().email().max(180).optional(),
  })
  .refine((d) => d.addressId || d.shippingAddress, {
    message: 'Debes indicar addressId o shippingAddress',
    path: ['addressId'],
  })

export const idParamSchema = z.object({ id: z.string().uuid('id inválido') })

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
})
