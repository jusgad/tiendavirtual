import { registerPaths, registerSchemas } from '../../../../shared/docs/openapi'

registerSchemas({
  Review: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      productId: { type: 'string', format: 'uuid' },
      rating: { type: 'integer', minimum: 1, maximum: 5 },
      title: { type: 'string', nullable: true },
      comment: { type: 'string', nullable: true },
      isAnonymous: { type: 'boolean' },
      authorName: { type: 'string', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
})

const authed = [{ bearerAuth: [] }]

registerPaths({
  '/products/{productId}/reviews': {
    get: {
      tags: ['Reseñas'],
      summary: 'Listar reseñas aprobadas de un producto',
      parameters: [
        { name: 'productId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        200: {
          description: 'Página de reseñas',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: { $ref: '#/components/schemas/Review' } },
                  total: { type: 'integer' },
                  page: { type: 'integer' },
                  pageSize: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['Reseñas'],
      summary: 'Crear una reseña (requiere haber recibido el producto)',
      security: authed,
      parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        201: { description: 'Creada' },
        400: { description: 'No hay compra entregada de este producto' },
        401: { description: 'No autenticado' },
        409: { description: 'Ya reseñaste este producto' },
      },
    },
  },
})
