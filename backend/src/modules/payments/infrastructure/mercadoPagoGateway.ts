import crypto from 'node:crypto'
import { ServiceUnavailableError } from '../../../shared/errors/AppError'
import {
  BuildCheckoutInput,
  CheckoutConfig,
  IncomingPaymentEvent,
  PaymentEventOutcome,
  PaymentGateway,
} from '../domain/ports'
import { PaymentStatus } from '../domain/paymentStatus'

export interface MercadoPagoConfig {
  /** Credencial privada. Firma todas las llamadas a la API. NUNCA sale de aquí. */
  accessToken: string
  /** Credencial pública. Puede viajar al navegador. */
  publicKey: string
  /** Secreto del webhook (panel: Webhooks > Configurar notificación). */
  webhookSecret: string
  /** URL pública de nuestro webhook. Si falta, Mercado Pago usa la del panel. */
  notificationUrl?: string
  /** A dónde vuelve la clienta al terminar en Mercado Pago. */
  backUrl?: string
  /** Lo que verá en el extracto de su tarjeta. Máx. 16 caracteres. */
  statementDescriptor?: string
  /** Sobrescribible en tests. */
  apiBaseUrl?: string
  /** Corta la espera si la API no responde. El checkout no puede quedarse colgado. */
  timeoutMs?: number
  /** `fetch` alternativo, para tests. */
  fetchImpl?: typeof fetch
}

const API_BASE_URL = 'https://api.mercadopago.com'
const TIMEOUT_MS = 10_000

/**
 * Access token de marcador de posición: el que trae `.env.example` mientras no
 * haya credenciales reales. Con él la API responde 401, así que conviene
 * detectarlo y decirlo, en vez de dejar que falle de forma confusa delante de
 * una clienta. `env.ts` además impide arrancar con él en producción.
 */
export function esTokenDeMarcador(accessToken: string): boolean {
  return !accessToken || /^(TEST|APP_USR)?-?0+(-0+)*$/.test(accessToken)
}

/**
 * Estados de un pago en Mercado Pago, traducidos a los nuestros.
 *
 * `authorized` es dinero retenido pero no cobrado y `in_mediation` es una
 * disputa abierta: en ninguno de los dos el pedido debe salir a reparto, así
 * que los dos equivalen a «pendiente».
 */
const STATUS_MAP: Record<string, PaymentStatus> = {
  approved: PaymentStatus.APPROVED,
  authorized: PaymentStatus.PENDING,
  pending: PaymentStatus.PENDING,
  in_process: PaymentStatus.PENDING,
  in_mediation: PaymentStatus.PENDING,
  rejected: PaymentStatus.DECLINED,
  cancelled: PaymentStatus.DECLINED,
  refunded: PaymentStatus.REFUNDED,
  charged_back: PaymentStatus.REFUNDED,
}

/** Tipos de aviso que nos interesan. El resto se ignora respondiendo 200. */
const TIPOS_DE_PAGO = new Set(['payment'])

interface PreferenceResponse {
  id?: string
  init_point?: string
  sandbox_init_point?: string
}

interface PaymentResponse {
  id?: number | string
  status?: string
  external_reference?: string | null
}

interface AvisoDeWebhook {
  /** Mercado Pago usa `type` en el cuerpo y `topic` en avisos antiguos. */
  type?: string
  topic?: string
  action?: string
  data?: { id?: string | number }
}

/**
 * Arma la cadena que Mercado Pago firma.
 *
 * Plantilla: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 *
 * Cada tramo que no venga en el aviso se omite entero (no se deja vacío), tal
 * y como indica la documentación. El `data.id` va en minúsculas: cuando el id
 * es alfanumérico, Mercado Pago lo firma así.
 */
export function buildSignatureManifest(
  dataId: string | null,
  requestId: string | null,
  ts: string | null,
): string {
  const tramos: string[] = []
  if (dataId) tramos.push(`id:${dataId.toLowerCase()};`)
  if (requestId) tramos.push(`request-id:${requestId};`)
  if (ts) tramos.push(`ts:${ts};`)
  return tramos.join('')
}

/** Parte `ts=1700000000,v1=abc...` en sus dos valores. */
export function parseSignatureHeader(header: string | null): { ts: string | null; v1: string | null } {
  if (!header) return { ts: null, v1: null }
  let ts: string | null = null
  let v1: string | null = null
  for (const parte of header.split(',')) {
    const sep = parte.indexOf('=')
    if (sep === -1) continue
    const clave = parte.slice(0, sep).trim()
    const valor = parte.slice(sep + 1).trim()
    if (clave === 'ts') ts = valor
    else if (clave === 'v1') v1 = valor
  }
  return { ts, v1 }
}

/** Comparación en tiempo constante, tolerante a mayúsculas/minúsculas. */
function firmaCoincide(esperada: string, recibida: string): boolean {
  const a = Buffer.from(esperada.toLowerCase())
  const b = Buffer.from(recibida.toLowerCase())
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/**
 * Adaptador de Mercado Pago (Checkout Pro). Única implementación del puerto
 * `PaymentGateway`.
 *
 * El número de tarjeta NUNCA pasa por aquí: la clienta lo teclea en el sitio
 * de Mercado Pago. Este adaptador crea el cobro, lo firma con el access token
 * y después verifica y consulta lo que Mercado Pago avisa.
 *
 * Se habla con la API por `fetch` y no por el SDK oficial, igual que con
 * Resend: son dos peticiones y así no entra otra dependencia al proyecto.
 */
export class MercadoPagoGateway implements PaymentGateway {
  private readonly baseUrl: string
  private readonly timeoutMs: number

  constructor(private readonly config: MercadoPagoConfig) {
    this.baseUrl = config.apiBaseUrl ?? API_BASE_URL
    this.timeoutMs = config.timeoutMs ?? TIMEOUT_MS
  }

  // `fetch` se resuelve en cada llamada, no al construir: así un test puede
  // sustituir el global después de que el módulo ya esté montado.
  private get fetch(): typeof fetch {
    return this.config.fetchImpl ?? globalThis.fetch
  }

  private get sandbox(): boolean {
    return this.config.accessToken.startsWith('TEST-')
  }

  // ---- Crear el cobro ----

  async buildCheckout(input: BuildCheckoutInput): Promise<CheckoutConfig> {
    const base = {
      configured: true,
      preferenceId: '',
      initPoint: '',
      publicKey: this.config.publicKey,
      reference: input.reference,
      amount: input.amount,
      currency: input.currency,
      sandbox: this.sandbox,
    }

    if (esTokenDeMarcador(this.config.accessToken)) {
      // Sin credenciales no se llama a la API: se devuelve un checkout
      // marcado como «sin configurar» para que el frontend lo diga.
      return { ...base, configured: false, sandbox: true }
    }

    const preferencia = await traducirFallo(() => this.crearPreferencia(input))
    const initPoint = preferencia.init_point ?? preferencia.sandbox_init_point
    if (!preferencia.id || !initPoint) {
      throw new ServiceUnavailableError('Mercado Pago no devolvió un checkout utilizable')
    }

    return { ...base, preferenceId: preferencia.id, initPoint }
  }

  private async crearPreferencia(input: BuildCheckoutInput): Promise<PreferenceResponse> {
    const cuerpo: Record<string, unknown> = {
      items: [
        {
          id: input.reference,
          title: input.description,
          quantity: 1,
          // Colombia no maneja decimales en COP: un monto con coma se rechaza.
          unit_price: Math.round(input.amount),
          currency_id: input.currency,
        },
      ],
      external_reference: input.reference,
      statement_descriptor: this.config.statementDescriptor,
    }

    if (this.config.notificationUrl) cuerpo.notification_url = this.config.notificationUrl
    if (this.config.backUrl) {
      cuerpo.back_urls = {
        success: this.config.backUrl,
        pending: this.config.backUrl,
        failure: this.config.backUrl,
      }
      // `auto_return` solo se pide con una URL https: con un `http://localhost`
      // Mercado Pago rechaza la preferencia entera, y perder el checkout en
      // desarrollo por una comodidad que allí no se nota no compensa.
      if (this.config.backUrl.startsWith('https://')) cuerpo.auto_return = 'approved'
    }

    return this.pedir<PreferenceResponse>('POST', '/checkout/preferences', {
      cuerpo,
      // Si la clienta vuelve a darle a «Pagar» sobre el mismo pedido, Mercado
      // Pago devuelve la preferencia que ya existía en vez de abrir un segundo
      // cobro por lo mismo.
      idempotencyKey: `pref-${input.reference}`,
    })
  }

  // ---- Verificar el aviso ----

  async verifyEvent(event: IncomingPaymentEvent): Promise<PaymentEventOutcome> {
    const aviso = (event.body && typeof event.body === 'object' ? event.body : {}) as AvisoDeWebhook

    // El id que Mercado Pago firma es el de la query string. El del cuerpo
    // sirve de respaldo cuando el aviso llega sin query (avisos antiguos):
    // en ese caso el tramo `id:` simplemente no entra en la firma.
    const idFirmado = event.queryDataId
    const idDelPago = event.queryDataId ?? (aviso.data?.id != null ? String(aviso.data.id) : null)

    const { ts, v1 } = parseSignatureHeader(event.signatureHeader)
    if (!v1) return { kind: 'invalid' }

    const esperada = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(buildSignatureManifest(idFirmado, event.requestId, ts))
      .digest('hex')
    if (!firmaCoincide(esperada, v1)) return { kind: 'invalid' }

    // A partir de aquí el aviso es auténtico. Todo lo que no sepamos procesar
    // se responde 200: un error haría que Mercado Pago lo reintente en bucle.
    const tipo = aviso.type ?? aviso.topic ?? event.queryType
    if (!tipo || !TIPOS_DE_PAGO.has(tipo)) {
      return { kind: 'ignored', reason: `tipo de aviso no procesado: ${tipo ?? 'sin tipo'}` }
    }
    if (!idDelPago) return { kind: 'ignored', reason: 'aviso sin id de pago' }

    const pago = await traducirFallo(() => this.consultarPago(idDelPago))
    // 404: el pago no existe. Pasa con las pruebas del panel de Mercado Pago,
    // que mandan un id inventado.
    if (!pago) return { kind: 'ignored', reason: `pago ${idDelPago} inexistente` }

    if (!pago.external_reference) {
      return { kind: 'ignored', reason: `pago ${idDelPago} sin referencia de comercio` }
    }

    const status = pago.status ? STATUS_MAP[pago.status.toLowerCase()] : undefined
    if (!status) {
      // Mercado Pago puede añadir estados nuevos. Ignorarlo deja el pago como
      // está, que es más seguro que adivinar si el dinero entró.
      return { kind: 'ignored', reason: `estado desconocido: ${pago.status ?? 'sin estado'}` }
    }

    return {
      kind: 'payment',
      result: {
        reference: pago.external_reference,
        transactionId: String(pago.id ?? idDelPago),
        status,
      },
    }
  }

  /** Devuelve el pago, o `null` si Mercado Pago dice que no existe. */
  private async consultarPago(id: string): Promise<PaymentResponse | null> {
    try {
      return await this.pedir<PaymentResponse>('GET', `/v1/payments/${encodeURIComponent(id)}`)
    } catch (err) {
      if (err instanceof ErrorDeMercadoPago && err.status === 404) return null
      throw err
    }
  }

  // ---- HTTP ----

  private async pedir<T>(
    metodo: 'GET' | 'POST',
    ruta: string,
    opciones: { cuerpo?: unknown; idempotencyKey?: string } = {},
  ): Promise<T> {
    const cabeceras: Record<string, string> = {
      Authorization: `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json',
    }
    if (opciones.idempotencyKey) cabeceras['X-Idempotency-Key'] = opciones.idempotencyKey

    let res: Response
    try {
      res = await this.fetch(`${this.baseUrl}${ruta}`, {
        method: metodo,
        headers: cabeceras,
        body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    } catch {
      // Red caída o tiempo agotado. No se filtra el error original: puede
      // llevar la URL con credenciales en algunos runtimes.
      throw new ServiceUnavailableError('No se pudo contactar con Mercado Pago')
    }

    if (!res.ok) {
      // El cuerpo del error dice el motivo real (credencial inválida, monto
      // mal formado…). Sin él, depurar esto es adivinar. Se recorta porque
      // termina en el log.
      const detalle = await res.text().catch(() => '')
      throw new ErrorDeMercadoPago(res.status, detalle.slice(0, 300))
    }

    return (await res.json()) as T
  }
}

/**
 * Respuesta de error de la API, con el código a mano.
 *
 * Es interna al adaptador: lleva el `status` para poder distinguir «ese pago
 * no existe» (404, que se ignora) de «la API falló» sin tener que leer el
 * texto del mensaje. Hacia fuera siempre sale un `ServiceUnavailableError`.
 */
class ErrorDeMercadoPago extends Error {
  constructor(
    readonly status: number,
    detalle: string,
  ) {
    super(`Mercado Pago respondió ${status}: ${detalle}`)
    this.name = 'ErrorDeMercadoPago'
  }
}

/**
 * Deja el error interno dentro del adaptador y hacia fuera lanza el error de
 * dominio que corresponde: un fallo de la pasarela es un 503, no un 500.
 * El motivo real se conserva en el mensaje, que es lo que acaba en el log.
 */
async function traducirFallo<T>(operacion: () => Promise<T>): Promise<T> {
  try {
    return await operacion()
  } catch (err) {
    if (err instanceof ErrorDeMercadoPago) throw new ServiceUnavailableError(err.message)
    throw err
  }
}
