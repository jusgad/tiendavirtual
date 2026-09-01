/**
 * Prepara la base de datos de la tienda en Supabase.
 *
 * Uso:  npm run supabase:setup
 *
 * Lee las cadenas de conexión de `.env` — nunca las pide por consola ni las
 * recibe como argumento, para que la contraseña de la base no acabe en el
 * historial del terminal.
 *
 * Hace tres cosas y verifica cada una:
 *   1. Revisa que las cadenas tengan sentido ANTES de intentar conectarse.
 *   2. Aplica las migraciones de Prisma y siembra los datos iniciales.
 *   3. Comprueba contra la base que quedó lo que tenía que quedar.
 *
 * Es seguro volver a ejecutarlo: las migraciones ya aplicadas se saltan y la
 * siembra usa `upsert`.
 */
import 'dotenv/config'
import { execFileSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'

const ROJO = '\x1b[31m'
const VERDE = '\x1b[32m'
const AMARILLO = '\x1b[33m'
const GRIS = '\x1b[90m'
const FIN = '\x1b[0m'

const ok = (m) => console.log(`${VERDE}✓${FIN} ${m}`)
const aviso = (m) => console.log(`${AMARILLO}!${FIN} ${m}`)
const nota = (m) => console.log(`${GRIS}  ${m}${FIN}`)

function abortar(titulo, ...detalles) {
  console.error(`\n${ROJO}✗ ${titulo}${FIN}`)
  for (const d of detalles) console.error(`  ${d}`)
  console.error('')
  process.exit(1)
}

/** Oculta la contraseña antes de imprimir cualquier cosa. */
const censurar = (cadena) => cadena.replace(/:\/\/([^:]+):[^@]+@/, '://$1:••••••@')

// ---------------------------------------------------------------------------
// 1. Revisar las cadenas
// ---------------------------------------------------------------------------

console.log('\n🗄  Preparando la base de datos en Supabase\n')

const { DATABASE_URL, DIRECT_URL } = process.env

if (!DATABASE_URL || !DIRECT_URL) {
  abortar(
    'Faltan DATABASE_URL o DIRECT_URL en backend/.env',
    'Cópialas del panel de Supabase → Connect. Mira docs/howto-supabase.md.',
  )
}

if (DATABASE_URL.includes('localhost') || DIRECT_URL.includes('localhost')) {
  abortar(
    'Las cadenas siguen apuntando a localhost',
    'Son las de la base local, no las de Supabase.',
    'Reemplázalas en backend/.env por las del panel de Supabase.',
  )
}

if (/\[(YOUR-PASSWORD|TU-CONTRASEÑA|PASSWORD)\]/i.test(DATABASE_URL + DIRECT_URL)) {
  abortar(
    'La cadena todavía tiene el marcador de la contraseña',
    'Supabase la entrega con [YOUR-PASSWORD] dentro; hay que reemplazarlo',
    'por la contraseña real de la base de datos (sin los corchetes).',
  )
}

const url = (cadena, cual) => {
  try {
    return new URL(cadena)
  } catch {
    return abortar(`${cual} no es una URL válida`, censurar(cadena))
  }
}

const app = url(DATABASE_URL, 'DATABASE_URL')
const migraciones = url(DIRECT_URL, 'DIRECT_URL')

// La conexión directa de Supabase (db.<ref>.supabase.co) solo resuelve por
// IPv6. Desde muchas redes domésticas y desde algunos proveedores de hosting
// no hay salida IPv6, y el fallo aparece como un "no se pudo conectar" que no
// dice por qué. Por eso las DOS cadenas tienen que ir por el pooler.
for (const [nombre, u] of [
  ['DATABASE_URL', app],
  ['DIRECT_URL', migraciones],
]) {
  if (u.hostname.startsWith('db.') && u.hostname.endsWith('.supabase.co')) {
    abortar(
      `${nombre} usa la conexión directa de Supabase`,
      `Host: ${u.hostname}`,
      'Esa conexión solo existe por IPv6 y desde aquí no resuelve.',
      'Usa las cadenas del pooler (*.pooler.supabase.com). En el panel:',
      'Connect → Session pooler / Transaction pooler.',
    )
  }
}

if (app.port !== '6543') {
  aviso(`DATABASE_URL usa el puerto ${app.port}; lo habitual es 6543 (transaction pooler).`)
  nota('Con el session pooler (5432) también funciona, pero aguanta menos conexiones.')
}
if (app.port === '6543' && !app.searchParams.has('pgbouncer')) {
  abortar(
    'A DATABASE_URL le falta ?pgbouncer=true',
    'En el pooler en modo transacción, Prisma necesita ese parámetro para no',
    'usar sentencias preparadas, que ahí no funcionan.',
    'Añade  ?pgbouncer=true  al final de la cadena.',
  )
}
if (migraciones.port !== '5432') {
  abortar(
    `DIRECT_URL usa el puerto ${migraciones.port}`,
    'Las migraciones necesitan una conexión de sesión: puerto 5432.',
    'En el panel de Supabase: Connect → Session pooler.',
  )
}

ok(`Aplicación  → ${censurar(DATABASE_URL)}`)
ok(`Migraciones → ${censurar(DIRECT_URL)}`)

// ---------------------------------------------------------------------------
// 2. Migrar y sembrar
// ---------------------------------------------------------------------------

const correr = (titulo, comando, args) => {
  console.log(`\n${GRIS}› ${titulo}…${FIN}`)
  try {
    execFileSync(comando, args, { stdio: 'inherit', shell: process.platform === 'win32' })
  } catch {
    abortar(
      `Falló: ${titulo}`,
      'Si el error habla de autenticación, revisa la contraseña de la cadena.',
      'Si habla de tiempo de espera, revisa que el proyecto de Supabase esté activo',
      '(los proyectos gratuitos se pausan tras una semana sin uso).',
    )
  }
}

correr('Generando el cliente de Prisma', 'npx', ['prisma', 'generate'])
correr('Aplicando las migraciones', 'npx', ['prisma', 'migrate', 'deploy'])
correr('Sembrando los datos iniciales', 'npx', ['tsx', 'prisma/seed.ts'])

// ---------------------------------------------------------------------------
// 3. Verificar contra la base
// ---------------------------------------------------------------------------

console.log(`\n${GRIS}› Comprobando cómo quedó…${FIN}`)

const prisma = new PrismaClient()
try {
  const tablas = await prisma.$queryRaw`
    SELECT count(*)::int AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
  ok(`${tablas[0].n} tablas creadas en el esquema public`)

  const [admins, productos, cupones] = await Promise.all([
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.product.count(),
    prisma.coupon.count(),
  ])

  if (admins === 0) abortar('No quedó ningún usuario administrador', 'La siembra no llegó a crearlo.')
  ok(`${admins} usuario(s) de administración`)
  ok(`${productos} producto(s) en el catálogo`)
  ok(`${cupones} cupón(es)`)

  // Con quién se conecta la tienda importa para la defensa extra de RLS:
  // `ENABLE ROW LEVEL SECURITY` no afecta al dueño de las tablas, y el dueño
  // es justo el rol que acaba de crearlas. Se comprueba en vez de suponerlo.
  const rol = await prisma.$queryRaw`
    SELECT current_user AS rolname,
           (SELECT count(*)::int FROM pg_tables
             WHERE schemaname = 'public' AND tableowner = current_user) AS propias`
  const { rolname, propias } = rol[0]
  console.log('')
  ok(`La tienda se conecta como "${rolname}" y es dueña de ${propias} tablas.`)
  if (propias >= tablas[0].n - 1) {
    nota('Puedes aplicar scripts/supabase-rls.sql como segunda cerradura: al')
    nota('dueño de la tabla RLS no le aplica, así que la tienda no se entera.')
  } else {
    aviso('No es dueña de todas las tablas: revisa supabase-rls.sql antes de aplicarlo.')
  }
} finally {
  await prisma.$disconnect()
}

console.log(`\n${VERDE}Base de datos lista.${FIN}`)
console.log(`
Falta hacer dos cosas en el panel de Supabase (ver docs/howto-supabase.md):

  1. Desactivar la Data API. Estas tablas guardan contraseñas cifradas,
     pedidos y direcciones; no deben quedar expuestas por HTTP.
  2. Cambiar la contraseña del administrador, que quedó con la de la semilla.
`)
