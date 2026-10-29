import 'dotenv/config'
import { z } from 'zod'

// Valores por defecto SOLO aptos para desarrollo. En producción se prohíben
// explícitamente (ver superRefine) para evitar desplegar con secretos conocidos.
export const INSECURE_MERCADO_PAGO_WEBHOOK_SECRET = 'dev_mercadopago_webhook_change_me'
export const INSECURE_ADMIN_PASSWORD = 'Admin123*'

/**
 * Access token de marcador: con él el backend no llama a la API y el checkout
 * se marca como «sin configurar». Útil en desarrollo y en CI, prohibido en
 * producción (ver superRefine).
 */
export const PLACEHOLDER_MERCADO_PAGO_ACCESS_TOKEN = 'TEST-0000000000000000-000000-0'

/** API real de Mercado Pago. Lo único que se admite en producción. */
export const MERCADO_PAGO_API_URL = 'https://api.mercadopago.com'

/**
 * URL opcional que tolera venir vacía.
 *
 * `dotenv` carga `VAR=` como cadena vacía, no como ausente, así que un
 * `.optional()` a secas haría que el backend se negara a arrancar con el
 * `.env.example` tal cual viene. Aquí el vacío significa «no configurada».
 */
const urlOpcional = () =>
  z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional())

// Validación centralizada de variables de entorno. Si algo falta o es inválido,
// el proceso falla al arrancar (fail-fast) en vez de romperse en runtime.
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(3000),
    API_PREFIX: z.string().default('/api'),
    // Nº de saltos de proxy de confianza (0 = ninguno). En AWS ALB/CloudFront: 1.
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),

    DATABASE_URL: z.string().url(),
    // Conexión directa a Postgres, solo para migraciones (ver schema.prisma).
    // Si no se define, cae a DATABASE_URL: en local ambas son la misma.
    DIRECT_URL: z.string().url().optional(),
    REDIS_URL: z.string().url(),

    JWT_ACCESS_SECRET: z.string().min(16),
    JWT_ACCESS_TTL: z.string().default('15m'),
    // El refresh token es opaco (bytes aleatorios hasheados en BD), no un JWT
    // firmado: solo necesita un TTL, no un secreto propio.
    JWT_REFRESH_TTL: z.string().default('7d'),

    BCRYPT_SALT_ROUNDS: z.coerce.number().min(10).max(15).default(12),
    PASSWORD_RESET_TTL_MIN: z.coerce.number().default(30),
    CORS_ORIGIN: z.string().default('*'),

    SHIPPING_FLAT_RATE: z.coerce.number().nonnegative().default(12900),
    FREE_SHIPPING_THRESHOLD: z.coerce.number().nonnegative().default(150000),

    // ---- Mercado Pago (pasarela de pago) ----
    // Access token: credencial PRIVADA, firma todas las llamadas a la API.
    // `TEST-…` son las de prueba y `APP_USR-…` las de producción.
    MERCADO_PAGO_ACCESS_TOKEN: z.string().min(1).default(PLACEHOLDER_MERCADO_PAGO_ACCESS_TOKEN),
    // Llave pública: puede viajar al navegador. No es secreta.
    MERCADO_PAGO_PUBLIC_KEY: z.string().min(1).default('TEST-00000000-0000-0000-0000-000000000000'),
    // Secreto del webhook (panel: Webhooks > Configurar notificación). Es lo
    // que impide que alguien falsifique una confirmación de pago.
    MERCADO_PAGO_WEBHOOK_SECRET: z.string().min(8).default(INSECURE_MERCADO_PAGO_WEBHOOK_SECRET),
    // URL PÚBLICA de nuestro webhook, p. ej. https://api.tutienda.co/api/payments/webhook/mercadopago
    // Si se deja vacía, Mercado Pago usa la que esté configurada en su panel;
    // si tampoco hay ninguna, ningún pago se confirmaría jamás.
    MERCADO_PAGO_NOTIFICATION_URL: urlOpcional(),
    // A dónde vuelve la clienta tras pagar. Si se deja vacía se usa
    // `FRONTEND_URL/track.html`, que es la página de seguimiento del pedido.
    MERCADO_PAGO_BACK_URL: urlOpcional(),
    // Lo que verá en el extracto de su tarjeta. Máximo 16 caracteres.
    MERCADO_PAGO_STATEMENT_DESCRIPTOR: z.string().max(16).default('POMASS'),
    // SOLO PARA PRUEBAS: apunta el backend a un doble local de la API de
    // Mercado Pago, para poder recorrer el flujo entero sin internet. En
    // producción se exige la API real (ver superRefine): si no, el access
    // token acabaría viajando a donde diga esta variable.
    MERCADO_PAGO_API_URL: z.preprocess(
      (v) => (v === '' ? undefined : v),
      z.string().url().default(MERCADO_PAGO_API_URL),
    ),
    // Permite desplegar un entorno de PRUEBAS con NODE_ENV=production y
    // credenciales de prueba. Sin esto no se podría montar un staging
    // realista. En la tienda real debe quedar en false: con true no entra dinero.
    PAYMENTS_SANDBOX: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),

    ADMIN_EMAIL: z.string().email().default('admin@pomass.co'),
    ADMIN_PASSWORD: z.string().min(8).default(INSECURE_ADMIN_PASSWORD),

    // ---- Correo transaccional ----
    // Sin llave no se envía nada: los correos quedan en el log. Es lo cómodo
    // en desarrollo, y `main.ts` avisa al arrancar si pasa en producción.
    RESEND_API_KEY: z.string().min(1).optional(),
    // Remitente. El dominio tiene que estar verificado en Resend o el envío
    // se rechaza. Formato "Nombre <correo@dominio>" o solo el correo.
    EMAIL_FROM: z.string().min(3).default('PomAss <onboarding@resend.dev>'),
    // Base pública del frontend: de aquí salen los enlaces de los correos
    // (seguimiento del pedido, restablecer contraseña). Sin barra final.
    FRONTEND_URL: z
      .string()
      .url()
      .default('http://localhost:5173')
      .transform((v) => v.replace(/\/+$/, '')),
  })
  // Endurecimiento en PRODUCCIÓN: prohíbe secretos por defecto y CORS abierto.
  .superRefine((cfg, ctx) => {
    if (cfg.NODE_ENV !== 'production') return

    const requireSecret = (value: string, insecure: string, key: string, hint: string) => {
      if (value === insecure) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: hint })
      }
    }
    requireSecret(
      cfg.MERCADO_PAGO_WEBHOOK_SECRET,
      INSECURE_MERCADO_PAGO_WEBHOOK_SECRET,
      'MERCADO_PAGO_WEBHOOK_SECRET',
      'Define el secreto del webhook de tu cuenta de Mercado Pago en producción (el valor por defecto permite falsificar confirmaciones de pago)',
    )
    requireSecret(
      cfg.MERCADO_PAGO_ACCESS_TOKEN,
      PLACEHOLDER_MERCADO_PAGO_ACCESS_TOKEN,
      'MERCADO_PAGO_ACCESS_TOKEN',
      'Define el access token de tu cuenta de Mercado Pago: con el de ejemplo el checkout ni siquiera abre',
    )
    // Desviar la API a otro host mandaría el access token a ese host. Es útil
    // para probar en local; en producción es, como poco, una fuga.
    if (cfg.MERCADO_PAGO_API_URL !== MERCADO_PAGO_API_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MERCADO_PAGO_API_URL'],
        message: `En producción MERCADO_PAGO_API_URL debe ser ${MERCADO_PAGO_API_URL} (o no definirse): apuntarla a otro sitio le entrega tu access token`,
      })
    }
    // Las credenciales de prueba no cobran de verdad. Se bloquean salvo que se
    // declare explícitamente que este despliegue ES un entorno de pruebas.
    if (cfg.MERCADO_PAGO_ACCESS_TOKEN.startsWith('TEST-') && !cfg.PAYMENTS_SANDBOX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MERCADO_PAGO_ACCESS_TOKEN'],
        message:
          'Estás usando credenciales de prueba de Mercado Pago con NODE_ENV=production: ningún pago real entraría. ' +
          'Usa el access token APP_USR-…, o declara PAYMENTS_SANDBOX=true si esto es un entorno de pruebas.',
      })
    }
    requireSecret(
      cfg.ADMIN_PASSWORD,
      INSECURE_ADMIN_PASSWORD,
      'ADMIN_PASSWORD',
      'Define un ADMIN_PASSWORD propio en producción (el valor por defecto es una credencial conocida)',
    )
    if (cfg.CORS_ORIGIN === '*') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CORS_ORIGIN'],
        message: 'En producción especifica los orígenes permitidos; "*" no está permitido',
      })
    }
    // Los correos llevan enlaces al seguimiento del pedido y al cambio de
    // contraseña. Con el valor de desarrollo apuntarían a `localhost`, que en
    // el correo de una clienta no abre nada.
    if (cfg.FRONTEND_URL.includes('localhost')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['FRONTEND_URL'],
        message:
          'Define FRONTEND_URL con la dirección pública de la tienda: los enlaces de los correos salen de ahí y con localhost no abren nada.',
      })
    }
  })

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Variables de entorno inválidas:', parsed.error.flatten().fieldErrors)
  throw new Error('Configuración de entorno inválida. Revisa tu archivo .env')
}

export const env = parsed.data
export type Env = typeof env
