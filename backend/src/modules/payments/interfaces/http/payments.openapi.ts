import { registerPaths, registerSchemas } from '../../../../shared/docs/openapi'

registerSchemas({
  Payment: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      orderId: { type: 'string', format: 'uuid' },
      method: { type: 'string', enum: ['WOMPI'] },
      status: { type: 'string', enum: ['PENDING', 'APPROVED', 'DECLINED', 'REFUNDED'] },
      amount: { type: 'number' },
      currency: { type: 'string', example: 'COP' },
      externalReference: { type: 'string', nullable: true, description: 'Número de pedido; es la referencia que ve Wompi' },
      wompiTransactionId: { type: 'string', nullable: true },
    },
  },
  CheckoutConfig: {
    type: 'object',
    description: 'Datos firmados para inicializar el widget de Wompi en el navegador.',
    properties: {
      publicKey: { type: 'string' },
      currency: { type: 'string', example: 'COP' },
      amountInCents: { type: 'integer' },
      reference: { type: 'string' },
      signature: { type: 'string', description: 'Firma de integridad SHA-256' },
      redirectUrl: { type: 'string', nullable: true },
    },
  },
})

const authed = [{ bearerAuth: [] }]

registerPaths({
  '/payments': {
    post: {
      tags: ['Pagos'],
      summary: 'Preparar el pago de un pedido (devuelve la configuración del widget de Wompi)',
      description:
        'Crea o reutiliza el registro de pago del pedido y devuelve los datos firmados que el ' +
        'widget de Wompi necesita. **No recibe datos de tarjeta**: el cliente los teclea dentro ' +
        'del widget, en su navegador. Admite invitados si el pedido también es de invitado.',
      security: authed,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['orderId'],
              properties: { orderId: { type: 'string', format: 'uuid' } },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Pago preparado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  payment: { $ref: '#/components/schemas/Payment' },
                  checkout: { $ref: '#/components/schemas/CheckoutConfig' },
                },
              },
            },
          },
        },
        404: { description: 'Pedido no encontrado' },
        409: { description: 'El pedido no está pendiente de pago' },
      },
    },
  },
  '/payments/{id}': {
    get: {
      tags: ['Pagos'],
      summary: 'Consultar un pago propio',
      security: authed,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        200: { description: 'Pago' },
        401: { description: 'No autenticado' },
        404: { description: 'Pago no encontrado' },
      },
    },
  },
  '/payments/webhook/wompi': {
    post: {
      tags: ['Pagos'],
      summary: 'Webhook de Wompi (evento transaction.updated)',
      description:
        'Única fuente de verdad de un pago. No lleva autenticación de usuario: se verifica el ' +
        'checksum que Wompi incluye en `signature.checksum` del propio cuerpo. Es idempotente: ' +
        'reentregas del mismo evento responden `idempotent: true` sin reprocesar, y un pago ya ' +
        'aprobado nunca se degrada.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                event: { type: 'string', example: 'transaction.updated' },
                data: {
                  type: 'object',
                  properties: {
                    transaction: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        reference: { type: 'string' },
                        status: { type: 'string', enum: ['APPROVED', 'DECLINED', 'VOIDED', 'ERROR', 'PENDING'] },
                        amount_in_cents: { type: 'integer' },
                      },
                    },
                  },
                },
                timestamp: { type: 'integer' },
                signature: {
                  type: 'object',
                  properties: {
                    properties: { type: 'array', items: { type: 'string' } },
                    checksum: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Evento procesado (o ignorado por idempotencia)' },
        401: { description: 'Checksum de evento inválido' },
        404: { description: 'Pago no encontrado para esa referencia' },
      },
    },
  },
})
