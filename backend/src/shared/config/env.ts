import 'dotenv/config'
import { z } from 'zod'

// Valores por defecto SOLO aptos para desarrollo. En producción se prohíben
// explícitamente (ver superRefine) para evitar desplegar con secretos conocidos.
export const INSECURE_WOMPI_INTEGRITY_SECRET = 'dev_wompi_integrity_change_me'
export const INSECURE_WOMPI_EVENTS_SECRET = 'dev_wompi_events_change_me'
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

    // ---- Wompi (pasarela de pago) ----
    // Llave pública: viaja al navegador para inicializar el widget. No es secreta.
    WOMPI_PUBLIC_KEY: z.string().min(1).default('pub_test_000000000000000000000000'),
    // Llave privada: solo para consultar transacciones contra la API de Wompi.
    WOMPI_PRIVATE_KEY: z.string().min(1).default('prv_test_000000000000000000000000'),
    // Secreto de integridad: firma referencia+monto+moneda que consume el widget.
    WOMPI_INTEGRITY_SECRET: z.string().min(8).default(INSECURE_WOMPI_INTEGRITY_SECRET),
    // Secreto de eventos: verifica el checksum de los webhooks de Wompi.
    WOMPI_EVENTS_SECRET: z.string().min(8).default(INSECURE_WOMPI_EVENTS_SECRET),
    // A dónde vuelve el cliente tras pagar en el widget. Debe apuntar al frontend.
    WOMPI_REDIRECT_URL: z.string().url().optional(),
    // Permite desplegar un entorno de PRUEBAS con NODE_ENV=production y llaves
    // de sandbox de Wompi. Sin esto no se podría montar un staging realista.
    // En la tienda real debe quedar en false: con true no entra dinero.
    PAYMENTS_SANDBOX: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),

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
      cfg.WOMPI_INTEGRITY_SECRET,
      INSECURE_WOMPI_INTEGRITY_SECRET,
      'WOMPI_INTEGRITY_SECRET',
      'Define el WOMPI_INTEGRITY_SECRET de tu cuenta de Wompi en producción (el valor por defecto permite alterar el monto del cobro)',
    )
    requireSecret(
      cfg.WOMPI_EVENTS_SECRET,
      INSECURE_WOMPI_EVENTS_SECRET,
      'WOMPI_EVENTS_SECRET',
      'Define el WOMPI_EVENTS_SECRET de tu cuenta de Wompi en producción (el valor por defecto permite falsificar confirmaciones de pago)',
    )
    // Las llaves de prueba de Wompi no cobran de verdad. Se bloquean salvo que
    // se declare explícitamente que este despliegue ES un entorno de pruebas.
    const usaSandbox =
      cfg.WOMPI_PUBLIC_KEY.startsWith('pub_test_') || cfg.WOMPI_PRIVATE_KEY.startsWith('prv_test_')
    if (usaSandbox && !cfg.PAYMENTS_SANDBOX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['WOMPI_PUBLIC_KEY'],
        message:
          'Estás usando llaves de sandbox de Wompi con NODE_ENV=production: ningún pago real entraría. ' +
          'Usa las llaves pub_prod_/prv_prod_, o declara PAYMENTS_SANDBOX=true si esto es un entorno de pruebas.',
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
  })

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Variables de entorno inválidas:', parsed.error.flatten().fieldErrors)
  throw new Error('Configuración de entorno inválida. Revisa tu archivo .env')
}

export const env = parsed.data
export type Env = typeof env
