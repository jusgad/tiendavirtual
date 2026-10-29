#!/usr/bin/env node
/**
 * Manda al webhook un evento firmado como lo firmaría Wompi, para poder
 * probar la confirmación de un pago sin cuenta, sin túnel y sin internet.
 *
 * A diferencia de otras pasarelas, el evento de Wompi **trae el resultado
 * dentro**: no hay que ir a preguntar nada después. Por eso basta con
 * firmarse uno a uno mismo y no hace falta levantar un doble de su API.
 *
 * Lo que NO se puede simular así es el widget: el cobro ocurre en un script
 * que Wompi sirve desde su dominio, en el navegador de la clienta. Para
 * recorrer la compra entera de verdad hacen falta credenciales de sandbox.
 *
 * Uso:
 *
 *   node scripts/wompi-falso.mjs --pedido PA-2026-ABC
 *   node scripts/wompi-falso.mjs --pedido PA-2026-ABC --estado DECLINED
 *   node scripts/wompi-falso.mjs --pedido PA-2026-ABC --monto 10280000 --id txn-002
 *
 * El secreto sale de WOMPI_EVENTS_SECRET; si no está, usa el de .env.example.
 */

import crypto from 'node:crypto'

function arg(nombre, pordefecto) {
  const i = process.argv.indexOf(`--${nombre}`)
  if (i === -1) return pordefecto
  const siguiente = process.argv[i + 1]
  return siguiente && !siguiente.startsWith('--') ? siguiente : true
}

const PEDIDO = arg('pedido', null)
const ESTADO = String(arg('estado', 'APPROVED'))
const ID = String(arg('id', 'txn-demo-001'))
const MONTO = Number(arg('monto', 10280000))
// 127.0.0.1 y no `localhost`: el `fetch` de Node resuelve `localhost` a ::1
// primero, y un servidor que solo escucha en IPv4 queda inalcanzable sin
// ningún error que lo explique.
const BACKEND = String(arg('backend', process.env.BACKEND_URL || 'http://127.0.0.1:3000'))
const SECRETO = process.env.WOMPI_EVENTS_SECRET || 'dev_wompi_events_change_me'

if (!PEDIDO) {
  console.error(
    'Falta --pedido <ORDER_NUMBER>. Ejemplo:\n' +
      '  node scripts/wompi-falso.mjs --pedido PA-2026-ABC',
  )
  process.exit(1)
}

/**
 * Checksum de Wompi:
 *   SHA256( concat(valores de signature.properties) + timestamp + secreto )
 *
 * Cada propiedad es una ruta con puntos relativa a `data`, y el orden del
 * array entra en la concatenación: cambiarlo cambia el resultado.
 */
const PROPIEDADES = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents']

const leer = (origen, ruta) =>
  ruta.split('.').reduce((acc, clave) => (acc == null ? undefined : acc[clave]), origen)

const data = {
  transaction: {
    id: ID,
    reference: PEDIDO,
    status: ESTADO,
    amount_in_cents: MONTO,
  },
}
const timestamp = Math.floor(Date.now() / 1000)
const concatenado = PROPIEDADES.map((p) => String(leer(data, p) ?? '')).join('')
const checksum = crypto
  .createHash('sha256')
  .update(`${concatenado}${timestamp}${SECRETO}`)
  .digest('hex')

const evento = {
  event: 'transaction.updated',
  data,
  timestamp,
  signature: { properties: PROPIEDADES, checksum },
}

const url = `${BACKEND}/api/payments/webhook/wompi`
console.log(`→ POST ${url}`)
console.log(`  pedido ${PEDIDO} · transacción ${ID} · estado ${ESTADO}`)
console.log(`  firmado sobre: ${concatenado}${timestamp}<secreto>`)

try {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evento),
  })
  console.log(`\n← ${res.status} ${await res.text()}`)
  if (!res.ok) process.exitCode = 1
} catch (err) {
  console.error(`\n✖ No se pudo avisar al backend: ${err.message}`)
  console.error(`  ¿Está corriendo en ${BACKEND}?`)
  process.exitCode = 1
}
