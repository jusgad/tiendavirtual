import { PaymentMethod } from './paymentMethod'
import { PaymentStatus } from './paymentStatus'

// -------- Pasarela de pago (Mercado Pago) --------

export interface BuildCheckoutInput {
  /** Referencia que verá la pasarela. Usamos el número de pedido legible. */
  reference: string
  /** Monto en la unidad principal (COP). */
  amount: number
  currency: string
  /** Descripción del cobro que verá la clienta en la pasarela. */
  description: string
}

/**
 * Lo que el navegador necesita para ir a pagar.
 *
 * Con Mercado Pago no hay nada que firmar aquí: el backend crea una
 * «preferencia» contra su API y recibe una URL (`initPoint`) a la que se
 * manda a la clienta. El monto vive del lado de Mercado Pago, así que no hay
 * forma de alterarlo desde el navegador.
 *
 * Aquí NO viaja ningún secreto: `publicKey` es pública por definición.
 */
export interface CheckoutConfig {
  /**
   * `false` cuando el backend todavía tiene el token de marcador de posición
   * de `.env.example`. El frontend lo usa para decirlo con claridad en vez de
   * mandar a la clienta a una URL vacía.
   */
  configured: boolean
  /** Id de la preferencia creada en Mercado Pago. Vacío si `configured` es false. */
  preferenceId: string
  /** URL del checkout de Mercado Pago. Vacía si `configured` es false. */
  initPoint: string
  publicKey: string
  reference: string
  amount: number
  currency: string
  /** true si la preferencia se creó con credenciales de prueba (no cobra dinero real). */
  sandbox: boolean
}

/**
 * Lo que llega en el webhook, ya traducido desde HTTP.
 *
 * Mercado Pago firma el aviso con datos que viven en tres sitios distintos
 * (cabeceras, query string y cuerpo), así que el puerto los pide todos en vez
 * de recibir solo el cuerpo como hacía la pasarela anterior.
 */
export interface IncomingPaymentEvent {
  body: unknown
  /** Cabecera `x-signature`: `ts=...,v1=...`. */
  signatureHeader: string | null
  /** Cabecera `x-request-id`. Entra en la firma. */
  requestId: string | null
  /** `data.id` de la query string. Es el valor que Mercado Pago firma. */
  queryDataId: string | null
  /**
   * `type` de la query string. Mercado Pago lo manda en los dos sitios; se
   * recoge también de aquí porque un aviso cuyo tipo no se reconoce se
   * descarta en silencio, y «el pago no se confirma nunca» es el fallo más
   * difícil de ver desde fuera.
   */
  queryType: string | null
}

/** Resultado de un aviso ya verificado y consultado contra la API. */
export interface PaymentEventResult {
  /** Referencia del comercio: nuestro `orderNumber`. */
  reference: string
  /** Id del pago en Mercado Pago. */
  transactionId: string
  status: PaymentStatus
}

/**
 * Tres desenlaces posibles de un aviso, y la diferencia importa:
 *
 * - `invalid`  → la firma no cuadra. Se responde 401 y no se toca nada.
 * - `ignored`  → la firma es buena pero el aviso no nos concierne (avisos de
 *   `merchant_order`, pruebas del panel, estados que no conocemos). Se
 *   responde 200: si respondiéramos error, Mercado Pago reintentaría el mismo
 *   aviso durante horas por algo que nunca vamos a procesar.
 * - `payment`  → hay un resultado de pago que aplicar.
 */
export type PaymentEventOutcome =
  | { kind: 'invalid' }
  | { kind: 'ignored'; reason: string }
  | { kind: 'payment'; result: PaymentEventResult }

/**
 * Puerto de la pasarela de pago. Un solo proveedor (Mercado Pago), no un
 * registro por método: el dominio no sabe nada de HTTP ni del formato de sus
 * payloads.
 *
 * Los dos métodos son asíncronos porque los dos hablan con la API de Mercado
 * Pago: crear la preferencia es una petición, y un aviso de webhook solo trae
 * el id del pago, así que hay que ir a preguntar en qué quedó.
 */
export interface PaymentGateway {
  /** Crea la preferencia de pago y devuelve a dónde mandar el navegador. */
  buildCheckout(input: BuildCheckoutInput): Promise<CheckoutConfig>
  /** Verifica la firma del aviso y consulta el pago real. */
  verifyEvent(event: IncomingPaymentEvent): Promise<PaymentEventOutcome>
}

// -------- Persistencia y pedido --------

export interface PaymentRecord {
  id: string
  orderId: string
  method: PaymentMethod
  status: PaymentStatus
  amount: number
  currency: string
  externalReference: string | null
  /** Id del pago en la pasarela. Llega en el aviso, no antes. */
  providerTransactionId: string | null
}

export interface PaymentRepository {
  create(data: {
    orderId: string
    method: PaymentMethod
    amount: number
    currency: string
    externalReference: string
  }): Promise<PaymentRecord>
  findByIdForUser(id: string, userId: string): Promise<PaymentRecord | null>
  findByExternalReference(ref: string): Promise<PaymentRecord | null>
  /** Pago aún sin resolver de un pedido. Permite reintentar sin duplicar filas. */
  findPendingByOrderId(orderId: string): Promise<PaymentRecord | null>
  markStatus(
    id: string,
    status: PaymentStatus,
    rawPayload: unknown,
    providerTransactionId: string | null,
  ): Promise<PaymentRecord>
}

export interface OrderForPayment {
  id: string
  orderNumber: string
  total: number
  currency: string
  status: string
}

/** Lo que hace falta para avisarle a la clienta de que su pago entró. */
export interface PaidOrderContact {
  orderNumber: string
  total: number
  /** Correo del usuario dueño o del invitado; `null` si el pedido no tiene. */
  contactEmail: string | null
}

export interface OrderPaymentGateway {
  /** userId null = invitado: solo puede pagar pedidos que también sean de invitado (sin dueño). */
  getForPayment(orderId: string, userId: string | null): Promise<OrderForPayment | null>
  /**
   * Transición PENDING -> PAID (con guarda).
   *
   * Devuelve los datos de contacto **solo si la transición se aplicó**, y
   * `null` si el pedido ya no estaba PENDING. Así el aviso de pago sale una
   * sola vez aunque Mercado Pago reenvíe el mismo evento: la idempotencia del
   * correo la da la misma guarda que la del estado, sin un segundo mecanismo
   * que mantener en sincronía.
   */
  markPaid(orderId: string): Promise<PaidOrderContact | null>
}

/**
 * Aviso de pago confirmado. No lanza, por el mismo motivo que en el checkout:
 * el pago ya está cobrado y registrado cuando esto se invoca, y un webhook que
 * responde error hace que Mercado Pago reintente el evento en bucle.
 */
export interface PaymentNotifier {
  orderPaid(data: { to: string; orderNumber: string; total: number }): Promise<void>
}
