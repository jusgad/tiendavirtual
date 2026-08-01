import { registerPaths, registerSchemas } from '../../../../shared/docs/openapi'

registerSchemas({
  CartView: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            productId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            price: { type: 'number' },
            quantity: { type: 'integer' },
            lineTotal: { type: 'number' },
            image: { type: 'string', nullable: true },
            stock: { type: 'integer' },
            inStock: { type: 'boolean' },
          },
        },
      },
      subtotal: { type: 'number' },
      itemCount: { type: 'integer' },
    },
  },
})

const guestNote =
  'Sirve a usuarios autenticados (Bearer) y a invitados. Los invitados pueden ' +
  'enviar el header `X-Guest-Id`; si no lo envían, la respuesta incluye un `guestId` a reutilizar.'

registerPaths({
  '/cart': {
    get: {
      tags: ['Carrito'],
      summary: 'Ver el carrito',
      description: guestNote,
      responses: { 200: { description: 'Carrito', content: { 'application/json': { schema: { type: 'object', properties: { cart: { $ref: '#/components/schemas/CartView' }, guestId: { type: 'string' } } } } } } },
    },
    delete: { tags: ['Carrito'], summary: 'Vaciar el carrito', responses: { 200: { description: 'Carrito vacío' } } },
  },
  '/cart/items': {
    post: {
      tags: ['Carrito'],
      summary: 'Agregar un producto al carrito',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['productId'],
              properties: { productId: { type: 'string', format: 'uuid' }, quantity: { type: 'integer', default: 1 } },
            },
          },
        },
      },
      responses: { 201: { description: 'Ítem agregado' }, 404: { description: 'Producto no disponible' }, 409: { description: 'Stock insuficiente' } },
    },
  },
  '/cart/items/{productId}': {
    patch: {
      tags: ['Carrito'],
      summary: 'Actualizar la cantidad de un ítem (0 = quitar)',
      parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { type: 'object', required: ['quantity'], properties: { quantity: { type: 'integer' } } } } },
      },
      responses: { 200: { description: 'Carrito actualizado' }, 409: { description: 'Stock insuficiente' } },
    },
    delete: {
      tags: ['Carrito'],
      summary: 'Quitar un ítem del carrito',
      parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { 200: { description: 'Ítem eliminado' } },
    },
  },
  '/cart/merge': {
    post: {
      tags: ['Carrito'],
      summary: 'Fusionar el carrito de invitado en el del usuario',
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['guestId'], properties: { guestId: { type: 'string' } } } } } },
      responses: { 200: { description: 'Carrito fusionado' }, 401: { description: 'No autenticado' } },
    },
  },
})
