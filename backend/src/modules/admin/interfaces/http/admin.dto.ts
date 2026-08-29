import { z } from 'zod'

export const salesReportQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  groupBy: z.enum(['day', 'month']).optional(),
})

export const topProductsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().optional(),
})

// -------- Gestión de pedidos --------

const ORDER_STATUSES = ['PENDING', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const

export const orderIdParamSchema = z.object({ id: z.string().uuid('id inválido') })

export const listOrdersQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  // Solo válidos al pasar a SHIPPED; el dominio impone esa regla y la
  // obligatoriedad. Aquí solo se valida la forma.
  carrier: z.string().trim().min(1).max(80).optional(),
  trackingNumber: z.string().trim().min(1).max(80).optional(),
})
