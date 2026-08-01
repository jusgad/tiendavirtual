import { registerPaths, registerSchemas } from '../../../../shared/docs/openapi'

registerSchemas({
  Payment: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      orderId: { type: 'string', format: 'uuid' },
      method: { type: 'string', enum: ['NEQUI', 'DAVIPLATA', 'CREDIT_CARD'] },
      status: { type: 'string', enum: ['PENDING', 'APPROVED', 'DECLINED', 'REFUNDED'] },
      amount: { type: 'number' },
      currency: { type: 'string', example: 'COP' },
      externalReference: { type: 'string', nullable: true },
    },
  },
})

const auth = [{ bearerAuth: [] }]

registerPaths({
  '/payments': {
    post: {
      tags: ['Pagos'],
      summary: 'Iniciar el pago de un pedido',
      description:
        'Crea un cobro con el proveedor (simulado) y devuelve las instrucciones. ' +
        'El pago queda PENDING hasta que llegue el webhook de confirmación.',
      security: auth,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['orderId', 'method'],
              properties: {
                orderId: { type: 'string', format: 'uuid' },
                method: { type: 'string', enum: ['NEQUI', 'DAVIPLATA', 'CREDIT_CARD'] },
                phone: { type: 'string', description: 'Celular (Nequi/Daviplata)' },
                card: {
                  type: 'object',
                  description: 'Datos de tarjeta (CREDIT_CARD)',
                  properties: {
                    number: { type: 'string' },
                    expMonth: { type: 'integer' },
                    expYear: { type: 'integer' },
                    cvv: { type: 'string' },
                    holder: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Cobro creado (PENDING) con instrucciones' },
        400: { description: 'Datos del método inválidos' },
        409: { description: 'El pedido no está pendiente de pago' },
      },
    },
  },
  '/payments/{id}': {
    get: {
      tags: ['Pagos'],
      summary: 'Consultar un pago propio',
      security: auth,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { 200: { description: 'Pago' }, 404: { description: 'No encontrado' } },
    },
  },
  '/payments/webhook/{provider}': {
    post: {
      tags: ['Pagos'],
      summary: 'Webhook de confirmación del proveedor',
      description:
        'Verificado por firma HMAC-SHA256 en el header `x-signature` (sobre el JSON del cuerpo, ' +
        'con PAYMENTS_WEBHOOK_SECRET). Si el pago es aprobado, el pedido pasa a PAID.',
      parameters: [
        { name: 'provider', in: 'path', required: true, schema: { type: 'string', enum: ['nequi', 'daviplata', 'card'] } },
        { name: 'x-signature', in: 'header', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['externalReference', 'status'],
              properties: {
                externalReference: { type: 'string' },
                status: { type: 'string', enum: ['APPROVED', 'DECLINED'] },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Webhook procesado' },
        401: { description: 'Firma inválida' },
        404: { description: 'Pago o proveedor no encontrado' },
      },
    },
  },
})
