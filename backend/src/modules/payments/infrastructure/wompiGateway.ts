import crypto from 'node:crypto'
import {
  BuildCheckoutInput,
  CheckoutConfig,
  PaymentEventResult,
  PaymentGateway,
} from '../domain/ports'
import { PaymentStatus } from '../domain/paymentStatus'

export interface WompiConfig {
  publicKey: string
  integritySecret: string
  eventsSecret: string
  redirectUrl?: string
}

/** Estados que reporta Wompi en `data.transaction.status`. */
const STATUS_MAP: Record<string, PaymentStatus> = {
  APPROVED: PaymentStatus.APPROVED,
  DECLINED: PaymentStatus.DECLINED,
  // Una transacción anulada o con error no se cobró: para el pedido equivale a
  // un rechazo (nunca lo mueve a PAID).
  VOIDED: PaymentStatus.DECLINED,
  ERROR: PaymentStatus.DECLINED,
  PENDING: PaymentStatus.PENDING,
}

/** Convierte COP a centavos, que es la unidad que espera Wompi. */
export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

/**
 * Firma de integridad del widget:
 *   SHA256(referencia + montoEnCentavos + moneda + secretoDeIntegridad)
 * Impide que el cliente altere el monto en el navegador antes de pagar.
 */
export function buildIntegritySignature(
  reference: string,
  amountInCents: number,
  currency: string,
  integritySecret: string,
): string {
  return crypto
    .createHash('sha256')
    .update(`${reference}${amountInCents}${currency}${integritySecret}`)
    .digest('hex')
}

/** Lee `transaction.id` dentro de `data` siguiendo una ruta con puntos. */
function readPath(source: unknown, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined
    return (acc as Record<string, unknown>)[key]
  }, source)
}

/**
 * Checksum de eventos de Wompi:
 *   SHA256(concat(valores de signature.properties) + timestamp + secretoDeEventos)
 *
 * Cada entrada de `signature.properties` es una ruta con puntos relativa a
 * `data` (p. ej. `transaction.id`). El orden importa: se concatena tal cual
 * viene en el array.
 */
export function buildEventChecksum(
  data: unknown,
  properties: string[],
  timestamp: number | string,
  eventsSecret: string,
): string {
  const concatenated = properties.map((p) => String(readPath(data, p) ?? '')).join('')
  return crypto
    .createHash('sha256')
    .update(`${concatenated}${timestamp}${eventsSecret}`)
    .digest('hex')
}

/** Comparación en tiempo constante, tolerante a mayúsculas/minúsculas. */
function checksumMatches(expected: string, received: string): boolean {
  const a = Buffer.from(expected.toLowerCase())
  const b = Buffer.from(received.toLowerCase())
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

interface WompiEventPayload {
  event?: string
  data?: { transaction?: { id?: string; status?: string; reference?: string } }
  timestamp?: number | string
  signature?: { properties?: string[]; checksum?: string }
}

/**
 * Adaptador de Wompi. Única implementación del puerto `PaymentGateway`.
 *
 * El número de tarjeta NUNCA pasa por aquí: el cliente lo teclea dentro del
 * widget de Wompi, en el navegador. Este adaptador solo firma lo que el widget
 * necesita y verifica lo que Wompi devuelve.
 */
export class WompiGateway implements PaymentGateway {
  constructor(private readonly config: WompiConfig) {}

  buildCheckout(input: BuildCheckoutInput): CheckoutConfig {
    const amountInCents = toCents(input.amount)
    return {
      publicKey: this.config.publicKey,
      currency: input.currency,
      amountInCents,
      reference: input.reference,
      signature: buildIntegritySignature(
        input.reference,
        amountInCents,
        input.currency,
        this.config.integritySecret,
      ),
      redirectUrl: this.config.redirectUrl ?? null,
    }
  }

  verifyEvent(payload: unknown): PaymentEventResult | null {
    if (!payload || typeof payload !== 'object') return null
    const event = payload as WompiEventPayload

    const properties = event.signature?.properties
    const checksum = event.signature?.checksum
    const timestamp = event.timestamp
    const transaction = event.data?.transaction

    if (!Array.isArray(properties) || !checksum || timestamp == null || !transaction) return null
    if (!transaction.id || !transaction.status || !transaction.reference) return null

    const expected = buildEventChecksum(event.data, properties, timestamp, this.config.eventsSecret)
    if (!checksumMatches(expected, checksum)) return null

    const status = STATUS_MAP[transaction.status.toUpperCase()]
    if (!status) return null

    return {
      reference: transaction.reference,
      transactionId: transaction.id,
      status,
    }
  }
}
