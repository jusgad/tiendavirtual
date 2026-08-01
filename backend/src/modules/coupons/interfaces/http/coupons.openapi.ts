import { registerPaths, registerSchemas } from '../../../../shared/docs/openapi'

registerSchemas({
  Coupon: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      code: { type: 'string' },
      type: { type: 'string', enum: ['PERCENTAGE', 'FIXED'] },
      value: { type: 'number' },
      minPurchase: { type: 'number', nullable: true },
      maxUses: { type: 'integer', nullable: true },
      usedCount: { type: 'integer' },
      perUserLimit: { type: 'integer', nullable: true },
      startsAt: { type: 'string', format: 'date-time', nullable: true },
      endsAt: { type: 'string', format: 'date-time', nullable: true },
      isActive: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
})

const admin = [{ bearerAuth: [] }]

registerPaths({
  '/coupons': {
    get: {
      tags: ['Cupones'],
      summary: 'Listar cupones (admin)',
      security: admin,
      parameters: [{ name: 'includeInactive', in: 'query', schema: { type: 'boolean', default: false } }],
      responses: {
        200: {
          description: 'Lista de cupones',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { coupons: { type: 'array', items: { $ref: '#/components/schemas/Coupon' } } },
              },
            },
          },
        },
        401: { description: 'No autenticado' },
        403: { description: 'Requiere admin' },
      },
    },
    post: {
      tags: ['Cupones'],
      summary: 'Crear cupón (admin)',
      security: admin,
      responses: {
        201: { description: 'Creado' },
        400: { description: 'Datos inválidos' },
        409: { description: 'Ya existe un cupón con ese código' },
      },
    },
  },
  '/coupons/{id}': {
    get: {
      tags: ['Cupones'],
      summary: 'Obtener un cupón por id (admin)',
      security: admin,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { 200: { description: 'Cupón' }, 404: { description: 'No encontrado' } },
    },
    patch: {
      tags: ['Cupones'],
      summary: 'Actualizar o desactivar un cupón (admin)',
      security: admin,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { 200: { description: 'Actualizado' }, 404: { description: 'No encontrado' } },
    },
  },
})
