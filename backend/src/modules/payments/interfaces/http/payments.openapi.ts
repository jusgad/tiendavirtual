import { registerPaths, registerSchemas } from '../../../../shared/docs/openapi'

registerSchemas({
  Payment: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      orderId: { type: 'string', format: 'uuid' },
      method: { type: 'string', enum: ['MERCADO_PAGO'] },
      status: { type: 'string', enum: ['PENDING', 'APPROVED', 'DECLINED', 'REFUNDED'] },
      amount: { type: 'number' },
      currency: { type: 'string', example: 'COP' },
      externalReference: {
        type: 'string',
        nullable: true,
        description: 'Número de pedido; es la referencia que ve Mercado Pago',
      },
      providerTransactionId: {
        type: 'string',
        nullable: true,
        description: 'Id del pago en Mercado Pago. Llega con el webhook, no antes.',
      },
    },
  },
  CheckoutConfig: {
    type: 'object',
    description:
      'A dónde mandar el navegador para pagar. No lleva secretos: la preferencia ya está ' +
      'creada del lado de Mercado Pago con el monto fijado, así que no hay nada que firmar.',
    properties: {
      configured: {
        type: 'boolean',
        description:
          'false cuando el backend todavía tiene el access token de ejemplo. El frontend lo ' +
          'usa para avisar en vez de mandar a la clienta a una URL vacía.',
      },
      preferenceId: { type: 'string' },
      initPoint: { type: 'string', description: 'URL del checkout de Mercado Pago' },
      publicKey: { type: 'string' },
      reference: { type: 'string' },
      amount: { type: 'number' },
      currency: { type: 'string', example: 'COP' },
      sandbox: { type: 'boolean', description: 'true con credenciales de prueba (no cobra dinero real)' },
    },
  },
})

const authed = [{ bearerAuth: [] }]

registerPaths({
  '/payments': {
    post: {
      tags: ['Pagos'],
      summary: 'Preparar el pago de un pedido (crea la preferencia de Mercado Pago)',
      description:
        'Crea o reutiliza el registro de pago del pedido, crea el cobro en Mercado Pago y ' +
        'devuelve la URL a la que hay que mandar el navegador. **No recibe datos de tarjeta**: ' +
        'la clienta los teclea en el sitio de Mercado Pago. Admite invitados si el pedido ' +
        'también es de invitado.',
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
        503: { description: 'Mercado Pago no respondió' },
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
  '/payments/webhook/mercadopago': {
    post: {
      tags: ['Pagos'],
      summary: 'Webhook de Mercado Pago',
      description:
        'Única fuente de verdad de un pago. No lleva autenticación de usuario: se verifica la ' +
        'firma HMAC-SHA256 de la cabecera `x-signature`, calculada sobre `data.id` (query), ' +
        '`x-request-id` y el `ts` de la propia cabecera. El aviso solo trae el id del pago, así ' +
        'que el backend consulta su estado real contra la API antes de tocar nada.\n\n' +
        'Es idempotente: reentregas del mismo aviso responden `idempotent: true` sin ' +
        'reprocesar, y un pago aprobado solo cambia si llega un reembolso o un contracargo. ' +
        'Los avisos que no son de pago (p. ej. `merchant_order`) responden 200 con ' +
        '`ignored: true` para que Mercado Pago deje de reintentarlos.',
      parameters: [
        {
          name: 'data.id',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Id del pago. Es el valor que entra en la firma.',
        },
        { name: 'x-signature', in: 'header', required: true, schema: { type: 'string', example: 'ts=1700000000,v1=abc…' } },
        { name: 'x-request-id', in: 'header', required: false, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                type: { type: 'string', example: 'payment' },
                action: { type: 'string', example: 'payment.updated' },
                data: { type: 'object', properties: { id: { type: 'string' } } },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Aviso procesado, ignorado, o repetido (idempotente)' },
        401: { description: 'Firma del evento inválida' },
        404: { description: 'Pago no encontrado para esa referencia' },
        503: { description: 'Mercado Pago no respondió a la consulta del pago' },
      },
    },
  },
})
