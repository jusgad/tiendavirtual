import { z } from 'zod'

export const idParamSchema = z.object({ id: z.string().uuid('id inválido') })

export const listQuerySchema = z.object({
  includeInactive: z.coerce.boolean().optional(),
})

const dateRangeRefinement = <T extends { startsAt?: Date | null; endsAt?: Date | null }>(d: T) =>
  !d.startsAt || !d.endsAt || d.startsAt < d.endsAt

export const createCouponSchema = z
  .object({
    code: z.string().trim().min(3).max(40),
    type: z.enum(['PERCENTAGE', 'FIXED']),
    value: z.number().positive('El valor debe ser mayor a 0'),
    minPurchase: z.number().nonnegative().optional(),
    maxUses: z.number().int().positive().optional(),
    perUserLimit: z.number().int().positive().optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    // Opcional: permite dar de alta un cupón ya desactivado (por ejemplo,
    // uno que se está preparando y todavía no debe poder canjearse). Si no
    // viene, la columna toma su valor por defecto en base de datos (`true`).
    isActive: z.boolean().optional(),
  })
  .refine(dateRangeRefinement, { message: 'startsAt debe ser anterior a endsAt', path: ['endsAt'] })
  .refine((d) => d.type !== 'PERCENTAGE' || d.value <= 100, {
    message: 'Un cupón porcentual no puede superar 100',
    path: ['value'],
  })

export const updateCouponSchema = z
  .object({
    type: z.enum(['PERCENTAGE', 'FIXED']),
    value: z.number().positive(),
    minPurchase: z.number().nonnegative().nullable(),
    maxUses: z.number().int().positive().nullable(),
    perUserLimit: z.number().int().positive().nullable(),
    startsAt: z.coerce.date().nullable(),
    endsAt: z.coerce.date().nullable(),
    isActive: z.boolean(),
  })
  .partial()
  .refine(dateRangeRefinement, { message: 'startsAt debe ser anterior a endsAt', path: ['endsAt'] })
