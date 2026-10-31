import {
  envSchema,
  INSECURE_ADMIN_PASSWORD,
  INSECURE_DB_PASSWORD,
  INSECURE_JWT_ACCESS_SECRET,
  INSECURE_WOMPI_EVENTS_SECRET,
  INSECURE_WOMPI_INTEGRITY_SECRET,
} from '../../../src/shared/config/env'

/**
 * El endurecimiento de producción (`superRefine`) es lo que impide desplegar
 * la tienda con secretos de ejemplo, conocidos por cualquiera que lea el
 * repo. No tenía pruebas: un cambio aquí podía aflojar la guarda sin que
 * nada se enterara. Estas lo amarran, campo por campo.
 */

const base = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://pomass:un-secreto-real@db.example.com:5432/pomass',
  REDIS_URL: 'redis://redis.example.com:6379',
  JWT_ACCESS_SECRET: 'un-secreto-de-verdad-y-bien-largo',
  WOMPI_PUBLIC_KEY: 'pub_prod_xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  WOMPI_PRIVATE_KEY: 'prv_prod_xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  WOMPI_INTEGRITY_SECRET: 'secreto-de-integridad-real',
  WOMPI_EVENTS_SECRET: 'secreto-de-eventos-real',
  ADMIN_PASSWORD: 'Una-Contraseña-Fuerte1',
  CORS_ORIGIN: 'https://pomass.co',
  FRONTEND_URL: 'https://pomass.co',
}

function errorPaths(cfg: Record<string, unknown>) {
  const r = envSchema.safeParse(cfg)
  if (r.success) return []
  return r.error.issues.map((i) => i.path.join('.'))
}

describe('env — endurecimiento de producción', () => {
  it('una configuración de producción con secretos propios pasa limpia', () => {
    const r = envSchema.safeParse(base)
    expect(r.success).toBe(true)
  })

  it('fuera de producción no exige nada de esto: el valor por defecto sirve para desarrollar', () => {
    const r = envSchema.safeParse({
      DATABASE_URL: 'postgresql://pomass:pomass_pass@localhost:5432/pomass',
      REDIS_URL: 'redis://localhost:6379',
      JWT_ACCESS_SECRET: INSECURE_JWT_ACCESS_SECRET,
    })
    expect(r.success).toBe(true)
  })

  it('rechaza el JWT_ACCESS_SECRET de ejemplo: con él se pueden forjar tokens de cualquier usuario', () => {
    expect(errorPaths({ ...base, JWT_ACCESS_SECRET: INSECURE_JWT_ACCESS_SECRET })).toContain(
      'JWT_ACCESS_SECRET',
    )
  })

  it('rechaza la contraseña de ejemplo de Postgres dentro de DATABASE_URL', () => {
    expect(
      errorPaths({
        ...base,
        DATABASE_URL: `postgresql://pomass:${INSECURE_DB_PASSWORD}@db.example.com:5432/pomass`,
      }),
    ).toContain('DATABASE_URL')
  })

  it('rechaza la contraseña de ejemplo de Postgres dentro de DIRECT_URL aunque DATABASE_URL esté bien', () => {
    expect(
      errorPaths({
        ...base,
        DIRECT_URL: `postgresql://pomass:${INSECURE_DB_PASSWORD}@db.example.com:5432/pomass`,
      }),
    ).toContain('DATABASE_URL')
  })

  it('rechaza el ADMIN_PASSWORD por defecto', () => {
    expect(errorPaths({ ...base, ADMIN_PASSWORD: INSECURE_ADMIN_PASSWORD })).toContain('ADMIN_PASSWORD')
  })

  it('rechaza los secretos de Wompi por defecto', () => {
    expect(
      errorPaths({ ...base, WOMPI_INTEGRITY_SECRET: INSECURE_WOMPI_INTEGRITY_SECRET }),
    ).toContain('WOMPI_INTEGRITY_SECRET')
    expect(errorPaths({ ...base, WOMPI_EVENTS_SECRET: INSECURE_WOMPI_EVENTS_SECRET })).toContain(
      'WOMPI_EVENTS_SECRET',
    )
  })

  it('rechaza llaves de sandbox de Wompi sin declarar PAYMENTS_SANDBOX', () => {
    expect(
      errorPaths({ ...base, WOMPI_PUBLIC_KEY: 'pub_test_000000000000000000000000' }),
    ).toContain('WOMPI_PUBLIC_KEY')
  })

  it('acepta llaves de sandbox si PAYMENTS_SANDBOX=true: es el caso de un staging a propósito', () => {
    const r = envSchema.safeParse({
      ...base,
      WOMPI_PUBLIC_KEY: 'pub_test_000000000000000000000000',
      WOMPI_PRIVATE_KEY: 'prv_test_000000000000000000000000',
      PAYMENTS_SANDBOX: 'true',
    })
    expect(r.success).toBe(true)
  })

  it('rechaza CORS_ORIGIN="*"', () => {
    expect(errorPaths({ ...base, CORS_ORIGIN: '*' })).toContain('CORS_ORIGIN')
  })

  it('rechaza FRONTEND_URL apuntando a localhost', () => {
    expect(errorPaths({ ...base, FRONTEND_URL: 'http://localhost:5173' })).toContain('FRONTEND_URL')
  })
})
