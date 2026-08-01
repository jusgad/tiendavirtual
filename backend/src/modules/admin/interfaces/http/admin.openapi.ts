import { registerPaths } from '../../../../shared/docs/openapi'

const admin = [{ bearerAuth: [] }]

registerPaths({
  '/admin/reports/sales': {
    get: {
      tags: ['Admin'],
      summary: 'Ventas por periodo (admin)',
      security: admin,
      parameters: [
        { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' }, description: 'Default: hace 30 días' },
        { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' }, description: 'Default: ahora' },
        { name: 'groupBy', in: 'query', schema: { type: 'string', enum: ['day', 'month'], default: 'day' } },
      ],
      responses: {
        200: {
          description: 'Reporte de ventas',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  points: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        period: { type: 'string' },
                        orders: { type: 'integer' },
                        revenue: { type: 'number' },
                      },
                    },
                  },
                  totalOrders: { type: 'integer' },
                  totalRevenue: { type: 'number' },
                },
              },
            },
          },
        },
        400: { description: '"from" posterior o igual a "to"' },
        401: { description: 'No autenticado' },
        403: { description: 'Requiere admin' },
      },
    },
  },
  '/admin/reports/top-products': {
    get: {
      tags: ['Admin'],
      summary: 'Productos más vendidos (admin)',
      security: admin,
      parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }],
      responses: { 200: { description: 'Top de productos por unidades vendidas' } },
    },
  },
  '/admin/reports/orders-by-status': {
    get: {
      tags: ['Admin'],
      summary: 'Conteo de pedidos por estado (admin)',
      security: admin,
      responses: { 200: { description: 'Conteo por OrderStatus' } },
    },
  },
})
