import { PaymentMethod } from './paymentMethod'
import { PaymentStatus } from './paymentStatus'

// -------- Pasarela de pago (Wompi) --------

export interface BuildCheckoutInput {
  /** Referencia que verá la pasarela. Usamos el número de pedido legible. */
  reference: string
  /** Monto en la unidad principal (COP). La pasarela lo quiere en centavos. */
  amount: number
  currency: string
}

/**
 * Datos que el widget de Wompi necesita en el navegador. `signature` es la firma
 * de integridad: impide que el cliente altere el monto antes de pagar.
 * Aquí NO viaja ningún secreto — solo la llave pública y el hash ya calculado.
 */
export interface CheckoutConfig {
  publicKey: string
  currency: string
  amountInCents: number
  reference: string
  signature: string
  redirectUrl: string | null
}

/** Resultado de un evento `transaction.updated` ya verificado. */
export interface PaymentEventResult {
  /** Referencia del comercio: nuestro `orderNumber`. */
  reference: string
  /** Id de la transacción en Wompi. */
  transactionId: string
  status: PaymentStatus
}

/**
 * Puerto de la pasarela de pago. Un solo proveedor (Wompi), no un registro por
 * método: el dominio no sabe nada de HTTP ni del formato de sus payloads.
 */
export interface PaymentGateway {
  /** Arma la configuración firmada que consumirá el widget en el navegador. */
  buildCheckout(input: BuildCheckoutInput): CheckoutConfig
  /**
   * Verifica el checksum del evento y extrae el resultado.
   * Devuelve null si el checksum no cuadra o el evento no es interpretable.
   */
  verifyEvent(payload: unknown): PaymentEventResult | null
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
  wompiTransactionId: string | null
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
    wompiTransactionId: string | null,
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
   * sola vez aunque Wompi reenvíe el mismo evento: la idempotencia del correo
   * la da la misma guarda que la del estado, sin un segundo mecanismo que
   * mantener en sincronía.
   */
  markPaid(orderId: string): Promise<PaidOrderContact | null>
}

/**
 * Aviso de pago confirmado. No lanza, por el mismo motivo que en el checkout:
 * el pago ya está cobrado y registrado cuando esto se invoca, y un webhook que
 * responde error hace que Wompi reintente el evento en bucle.
 */
export interface PaymentNotifier {
  orderPaid(data: { to: string; orderNumber: string; total: number }): Promise<void>
}
