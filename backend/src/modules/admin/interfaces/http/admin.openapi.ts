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
  '/admin/orders': {
    get: {
      tags: ['Admin'],
      summary: 'Listar todos los pedidos (admin)',
      security: admin,
      parameters: [
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['PENDING', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
          },
        },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
      ],
      responses: { 200: { description: 'Página de pedidos' } },
    },
  },
  '/admin/orders/{id}': {
    get: {
      tags: ['Admin'],
      summary: 'Detalle de un pedido (admin)',
      description: 'Incluye `allowedTransitions`: los estados a los que se puede mover desde el actual.',
      security: admin,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { 200: { description: 'Pedido' }, 404: { description: 'No encontrado' } },
    },
  },
  '/admin/orders/{id}/status': {
    patch: {
      tags: ['Admin'],
      summary: 'Avanzar o cancelar un pedido (admin)',
      description:
        'Mueve el pedido por su ciclo de vida operativo: `PAID → PREPARING → SHIPPED → DELIVERED`. ' +
        'Es lo que alimenta la línea de tiempo del seguimiento público y lo que habilita las ' +
        'reseñas (solo se puede reseñar un producto de un pedido `DELIVERED`).\n\n' +
        '**No se puede marcar `PAID` a mano**: ese estado solo lo produce el webhook de pago ' +
        'verificado. Cancelar un pedido que aún no se despachó devuelve el stock al catálogo.',
      security: admin,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: {
                  type: 'string',
                  enum: ['PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
                },
                carrier: {
                  type: 'string',
                  description:
                    'Transportadora. Obligatoria junto con trackingNumber al pasar a SHIPPED; ' +
                    'prohibida en cualquier otra transición.',
                  example: 'Servientrega',
                },
                trackingNumber: {
                  type: 'string',
                  description: 'Número de guía. Obligatorio junto con carrier al pasar a SHIPPED.',
                  example: 'ABC123456789',
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Pedido actualizado, con sus nuevas transiciones posibles' },
        400: {
          description:
            'Ya está en ese estado, se intentó marcar PAID a mano, se despachó sin transportadora ' +
            'o guía, o se enviaron datos de despacho en una transición que no es el envío',
        },
        404: { description: 'Pedido no encontrado' },
        409: { description: 'Transición no permitida desde el estado actual' },
      },
    },
  },
})
