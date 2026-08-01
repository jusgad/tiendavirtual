import crypto from 'node:crypto'
import { BadRequestError } from '../../../shared/errors/AppError'
import {
  CreateChargeInput,
  CreateChargeResult,
  PaymentProvider,
  PaymentProviderRegistry,
  WebhookResult,
} from '../domain/ports'
import { PaymentMethod } from '../domain/paymentMethod'

// ---- Utilidades de firma (HMAC-SHA256) ----

export function signPayload(payload: unknown, secret: string): string {
  return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex')
}

function verifySignature(payload: unknown, signature: string | undefined, secret: string): boolean {
  if (!signature) return false
  const expected = signPayload(payload, secret)
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** Extrae { externalReference, approved } de un payload de webhook verificado. */
function parseWebhook(payload: unknown, signature: string | undefined, secret: string): WebhookResult | null {
  if (!verifySignature(payload, signature, secret)) return null
  const p = payload as { externalReference?: string; status?: string }
  if (!p.externalReference || !p.status) return null
  return { externalReference: p.externalReference, approved: p.status.toUpperCase() === 'APPROVED' }
}

const ref = (prefix: string) => `${prefix}_${crypto.randomUUID()}`

// ---- Validaciones ----

function requireColombianPhone(methodData: Record<string, unknown>): string {
  const phone = String(methodData.phone ?? '')
  if (!/^3\d{9}$/.test(phone)) {
    throw new BadRequestError('Número de celular colombiano inválido (debe iniciar en 3 y tener 10 dígitos)')
  }
  return phone
}

/** Algoritmo de Luhn para validar el número de tarjeta. */
function luhnValid(number: string): boolean {
  const digits = number.replace(/\s+/g, '')
  if (!/^\d{13,19}$/.test(digits)) return false
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i])
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

// ---- Adaptadores por proveedor (stub) ----

export class NequiProvider implements PaymentProvider {
  readonly method = PaymentMethod.NEQUI
  constructor(private readonly secret: string) {}
  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    requireColombianPhone(input.methodData)
    // API real: POST /payments a Nequi con el celular; aquí simulado.
    return {
      externalReference: ref('nequi'),
      instructions: `Abre tu app Nequi y aprueba el pago de $${input.amount} para ${input.orderReference}`,
    }
  }
  verifyWebhook(payload: unknown, signature: string | undefined): WebhookResult | null {
    return parseWebhook(payload, signature, this.secret)
  }
}

export class DaviplataProvider implements PaymentProvider {
  readonly method = PaymentMethod.DAVIPLATA
  constructor(private readonly secret: string) {}
  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    requireColombianPhone(input.methodData)
    return {
      externalReference: ref('daviplata'),
      instructions: `Ingresa a Daviplata y confirma el pago de $${input.amount} para ${input.orderReference}`,
    }
  }
  verifyWebhook(payload: unknown, signature: string | undefined): WebhookResult | null {
    return parseWebhook(payload, signature, this.secret)
  }
}

export class CreditCardProvider implements PaymentProvider {
  readonly method = PaymentMethod.CREDIT_CARD
  constructor(private readonly secret: string) {}
  async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
    const card = (input.methodData.card ?? {}) as {
      number?: string
      expMonth?: number
      expYear?: number
      cvv?: string
    }
    if (!card.number || !luhnValid(card.number)) {
      throw new BadRequestError('Número de tarjeta inválido')
    }
    if (!card.cvv || !/^\d{3,4}$/.test(card.cvv)) {
      throw new BadRequestError('CVV inválido')
    }
    const now = new Date()
    if (
      !card.expMonth ||
      !card.expYear ||
      card.expMonth < 1 ||
      card.expMonth > 12 ||
      new Date(card.expYear, card.expMonth) < now
    ) {
      throw new BadRequestError('Fecha de expiración de la tarjeta inválida o vencida')
    }
    // API real: tokenizar y autorizar con la pasarela; aquí simulado.
    return {
      externalReference: ref('card'),
      instructions: 'Autorizando el pago con tu tarjeta...',
    }
  }
  verifyWebhook(payload: unknown, signature: string | undefined): WebhookResult | null {
    return parseWebhook(payload, signature, this.secret)
  }
}

export class ProviderRegistry implements PaymentProviderRegistry {
  private readonly providers: Map<PaymentMethod, PaymentProvider>
  constructor(providers: PaymentProvider[]) {
    this.providers = new Map(providers.map((p) => [p.method, p]))
  }
  get(method: PaymentMethod): PaymentProvider {
    const provider = this.providers.get(method)
    if (!provider) throw new BadRequestError(`Método de pago no soportado: ${method}`)
    return provider
  }
}

/** Mapea la ruta del webhook (`nequi`/`daviplata`/`card`) al método de pago. */
export function providerKeyToMethod(key: string): PaymentMethod | null {
  const map: Record<string, PaymentMethod> = {
    nequi: PaymentMethod.NEQUI,
    daviplata: PaymentMethod.DAVIPLATA,
    card: PaymentMethod.CREDIT_CARD,
  }
  return map[key] ?? null
}
