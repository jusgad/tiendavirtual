import { z } from 'zod'

export const productIdParamSchema = z.object({ productId: z.string().uuid('id de producto inválido') })

export const listReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(1).max(120).optional(),
  comment: z.string().trim().min(1).max(2000).optional(),
  isAnonymous: z.boolean().optional(),
})
