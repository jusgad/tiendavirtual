import { z } from 'zod'

export const salesReportQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  groupBy: z.enum(['day', 'month']).optional(),
})

export const topProductsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().optional(),
})
