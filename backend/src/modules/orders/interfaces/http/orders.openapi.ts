import { registerPaths, registerSchemas } from '../../../../shared/docs/openapi'

registerSchemas({
  Order: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      orderNumber: { type: 'string', example: 'PA-2026-A1B2C3' },
      status: { type: 'string', enum: ['PENDING', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] },
      subtotal: { type: 'number' },
      discountTotal: { type: 'number' },
      shippingTotal: { type: 'number' },
      total: { type: 'number' },
      currency: { type: 'string', example: 'COP' },
      discreetPackaging: { type: 'boolean' },
      items: { type: 'array', items: { type: 'object' } },
      shipping: { type: 'object' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  Address: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      fullName: { type: 'string' },
      phone: { type: 'string' },
      line1: { type: 'string' },
      line2: { type: 'string', nullable: true },
      city: { type: 'string' },
      department: { type: 'string' },
      postalCode: { type: 'string', nullable: true },
      isDefault: { type: 'boolean' },
    },
  },
})

const auth = [{ bearerAuth: [] }]

registerPaths({
  '/orders': {
    post: {
      tags: ['Pedidos'],
      summary: 'Checkout: crea un pedido a partir del carrito',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                addressId: { type: 'string', format: 'uuid', description: 'Dirección guardada del usuario' },
                shippingAddress: { $ref: '#/components/schemas/Address' },
                couponCode: { type: 'string' },
                discreetPackaging: { type: 'boolean', description: 'Empaque discreto sin marca visible' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Pedido creado', content: { 'application/json': { schema: { type: 'object', properties: { order: { $ref: '#/components/schemas/Order' } } } } } },
        400: { description: 'Carrito vacío, cupón o dirección inválidos' },
        409: { description: 'Stock insuficiente' },
      },
    },
    get: { tags: ['Pedidos'], summary: 'Listar mis pedidos', security: auth, responses: { 200: { description: 'Página de pedidos' } } },
  },
  '/orders/{id}': {
    get: {
      tags: ['Pedidos'],
      summary: 'Ver un pedido propio',
      security: auth,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { 200: { description: 'Pedido' }, 404: { description: 'No encontrado' } },
    },
  },
  '/orders/{id}/cancel': {
    post: {
      tags: ['Pedidos'],
      summary: 'Cancelar un pedido propio (restaura stock)',
      security: auth,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { 200: { description: 'Pedido cancelado' }, 409: { description: 'Estado no cancelable' } },
    },
  },
  '/addresses': {
    get: { tags: ['Pedidos'], summary: 'Listar mis direcciones', security: auth, responses: { 200: { description: 'Direcciones' } } },
    post: { tags: ['Pedidos'], summary: 'Crear dirección', security: auth, responses: { 201: { description: 'Creada' } } },
  },
  '/addresses/{id}': {
    patch: { tags: ['Pedidos'], summary: 'Actualizar dirección', security: auth, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Actualizada' } } },
    delete: { tags: ['Pedidos'], summary: 'Eliminar dirección', security: auth, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 204: { description: 'Eliminada' } } },
  },
})
