import 'dotenv/config'
import { z } from 'zod'

// Valores por defecto SOLO aptos para desarrollo. En producción se prohíben
// explícitamente (ver superRefine) para evitar desplegar con secretos conocidos.
export const INSECURE_WOMPI_INTEGRITY_SECRET = 'dev_wompi_integrity_change_me'
export const INSECURE_WOMPI_EVENTS_SECRET = 'dev_wompi_events_change_me'
export const INSECURE_ADMIN_PASSWORD = 'Admin123*'
// El texto literal que trae `.env.example` para JWT_ACCESS_SECRET. Pasa la
// validación de longitud (36 caracteres), así que sin esta guarda un deploy
// que copiara el ejemplo tal cual arrancaría firmando tokens con un secreto
// público, leíble por cualquiera en el repo: cualquiera podría forjar un
// token válido de cualquier usuario, incluida la cuenta ADMIN.
export const INSECURE_JWT_ACCESS_SECRET = 'cambia_esto_por_un_secreto_largo_y_aleatorio'
// La contraseña de ejemplo de Postgres. Si DATABASE_URL/DIRECT_URL todavía la
// llevan en producción, la base queda con una contraseña conocida.
export const INSECURE_DB_PASSWORD = 'pomass_pass'

// Validación centralizada de variables de entorno. Si algo falta o es inválido,
// el proceso falla al arrancar (fail-fast) en vez de romperse en runtime.
// Se exporta (y no solo `env`, el singleton ya parseado) para poder probar el
// endurecimiento de producción con fixtures, sin depender de `process.env`.
export const envSchema = z
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

    // ---- Almacenamiento de imágenes (Supabase Storage) ----
    // Las tres son opcionales: sin ellas, la app arranca igual y el panel de
    // administración sigue aceptando imágenes por URL como siempre — solo
    // el botón «Subir imagen» responde con el error de `NotConfiguredImageStorage`
    // en vez de la URL pública. No es un requisito de arranque (como el JWT o
    // Wompi) porque subir fotos no es indispensable para que la tienda venda.
    SUPABASE_URL: z.string().url().optional(),
    // La «service role», no la `anon`: necesita permiso de escritura en el
    // bucket. Nunca viaja al navegador, solo vive en el servidor.
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    SUPABASE_STORAGE_BUCKET: z.string().min(1).default('product-images'),
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
    requireSecret(
      cfg.JWT_ACCESS_SECRET,
      INSECURE_JWT_ACCESS_SECRET,
      'JWT_ACCESS_SECRET',
      'Define un JWT_ACCESS_SECRET propio y aleatorio en producción (el de .env.example es público: con él cualquiera firma tokens válidos de cualquier usuario)',
    )
    if (cfg.DATABASE_URL.includes(INSECURE_DB_PASSWORD) || cfg.DIRECT_URL?.includes(INSECURE_DB_PASSWORD)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATABASE_URL'],
        message:
          'DATABASE_URL/DIRECT_URL todavía llevan la contraseña de ejemplo de Postgres (pomass_pass). ' +
          'Cambia POSTGRES_PASSWORD y reconstruye las cadenas de conexión antes de desplegar.',
      })
    }
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
  // A diferencia del bloque de arriba, esta comprobación no es solo de
  // producción: una de las dos puesta y la otra no es casi siempre un
  // despiste al copiar el `.env` (falta una línea), y mejor que la app
  // avise fuerte a que el botón «Subir imagen» falle en silencio para quien
  // administra sin decir por qué.
  .superRefine((cfg, ctx) => {
    const tieneUrl = Boolean(cfg.SUPABASE_URL)
    const tieneLlave = Boolean(cfg.SUPABASE_SERVICE_ROLE_KEY)
    if (tieneUrl !== tieneLlave) {
      const faltante = tieneUrl ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_URL'
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [faltante],
        message: `Falta ${faltante}: para subir imágenes hacen falta las dos variables de Supabase Storage juntas, o ninguna.`,
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
