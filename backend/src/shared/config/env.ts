import 'dotenv/config'
import { z } from 'zod'

// Valores por defecto SOLO aptos para desarrollo. En producción se prohíben
// explícitamente (ver superRefine) para evitar desplegar con secretos conocidos.
export const INSECURE_WEBHOOK_SECRET = 'dev_webhook_secret_change_me'
export const INSECURE_ADMIN_PASSWORD = 'Admin123*'

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

    // Secreto para verificar la firma de los webhooks de pago (HMAC-SHA256).
    PAYMENTS_WEBHOOK_SECRET: z.string().min(8).default(INSECURE_WEBHOOK_SECRET),

    ADMIN_EMAIL: z.string().email().default('admin@pomass.co'),
    ADMIN_PASSWORD: z.string().min(8).default(INSECURE_ADMIN_PASSWORD),
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
      cfg.PAYMENTS_WEBHOOK_SECRET,
      INSECURE_WEBHOOK_SECRET,
      'PAYMENTS_WEBHOOK_SECRET',
      'Define un PAYMENTS_WEBHOOK_SECRET propio en producción (el valor por defecto permite falsificar webhooks de pago)',
    )
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
  })

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Variables de entorno inválidas:', parsed.error.flatten().fieldErrors)
  throw new Error('Configuración de entorno inválida. Revisa tu archivo .env')
}

export const env = parsed.data
export type Env = typeof env
