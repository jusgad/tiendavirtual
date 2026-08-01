import { PaymentMethod } from './paymentMethod'
import { PaymentStatus } from './paymentStatus'

// -------- Proveedor de pago (adaptador por método) --------

export interface CreateChargeInput {
  orderReference: string // número de pedido legible
  amount: number
  currency: string
  methodData: Record<string, unknown> // teléfono (Nequi/Daviplata) o tarjeta
}

export interface CreateChargeResult {
  externalReference: string // id de la transacción del proveedor
  instructions: string // qué debe hacer el usuario para completar el pago
}

export interface WebhookResult {
  externalReference: string
  approved: boolean
}

/**
 * Puerto de proveedor de pago. Cada método (Nequi, Daviplata, tarjeta) lo
 * implementa con la forma real de su API, pero con llamadas simuladas (stub).
 */
export interface PaymentProvider {
  readonly method: PaymentMethod
  /** Crea el cobro. Puede lanzar BadRequestError si los datos del método son inválidos. */
  createCharge(input: CreateChargeInput): Promise<CreateChargeResult>
  /** Verifica la firma del webhook y extrae el resultado. Devuelve null si la firma es inválida. */
  verifyWebhook(payload: unknown, signature: string | undefined): WebhookResult | null
}

export interface PaymentProviderRegistry {
  get(method: PaymentMethod): PaymentProvider
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
  markStatus(id: string, status: PaymentStatus, rawPayload: unknown): Promise<PaymentRecord>
}

export interface OrderForPayment {
  id: string
  orderNumber: string
  total: number
  currency: string
  status: string
}

export interface OrderPaymentGateway {
  /** userId null = invitado: solo puede pagar pedidos que también sean de invitado (sin dueño). */
  getForPayment(orderId: string, userId: string | null): Promise<OrderForPayment | null>
  /** Transición PENDING -> PAID (con guarda). Devuelve true si aplicó. */
  markPaid(orderId: string): Promise<boolean>
}
