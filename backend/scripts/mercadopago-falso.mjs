#!/usr/bin/env node
/**
 * Doble local de la API de Mercado Pago, para probar el flujo de pagos entero
 * sin internet, sin túnel y sin una cuenta de sandbox.
 *
 * Hace falta porque Mercado Pago no manda el resultado dentro del aviso: el
 * aviso solo trae el id del pago, y el backend va a preguntar en qué quedó.
 * Eso significa que ya no basta con firmarse un evento a uno mismo — hay que
 * tener algo que conteste esa consulta. Esto es ese algo.
 *
 * Levanta dos endpoints, los únicos que el backend usa:
 *
 *   POST /checkout/preferences   → devuelve una preferencia con su init_point
 *   GET  /v1/payments/:id        → devuelve el pago con el estado que le pidas
 *
 * Uso:
 *
 *   1) En `backend/.env`, apunta el backend aquí y ponle un token cualquiera
 *      que no sea el de ejemplo (si no, el backend ni llama a la API):
 *
 *        MERCADO_PAGO_ACCESS_TOKEN=TEST-pruebas-locales
 *        MERCADO_PAGO_API_URL=http://localhost:4100
 *
 *   2) Reinicia el backend y crea un pedido (ver docs/howto-probar-pagos.md).
 *
 *   3) node scripts/mercadopago-falso.mjs --pedido PA-2026-ABC --enviar
 *
 * El script firma el aviso igual que lo haría Mercado Pago (HMAC-SHA256 sobre
 * `id:…;request-id:…;ts:…;`), se lo manda al webhook del backend y te enseña
 * la respuesta.
 *
 * NO sirve para verificar que tus credenciales reales funcionan: para eso hay
 * que ir al sandbox de verdad. Sirve para verificar que TU backend hace lo que
 * debe con lo que Mercado Pago le diría.
 */

import crypto from 'node:crypto'
import http from 'node:http'

// ---- Argumentos ----

function arg(nombre, pordefecto) {
  const i = process.argv.indexOf(`--${nombre}`)
  if (i === -1) return pordefecto
  const siguiente = process.argv[i + 1]
  return siguiente && !siguiente.startsWith('--') ? siguiente : true
}

const PUERTO = Number(arg('puerto', 4100))
const PEDIDO = arg('pedido', null)
const ESTADO = arg('estado', 'approved')
const ID_PAGO = String(arg('id-pago', '111222333'))
const ENVIAR = Boolean(arg('enviar', false))
// 127.0.0.1 y no `localhost`: el `fetch` de Node resuelve `localhost` a ::1
// primero, y un servidor que solo escucha en IPv4 queda inalcanzable sin
// ningún error que lo explique. Con la IP literal no hay ambigüedad.
const BACKEND = String(arg('backend', 'http://127.0.0.1:3000'))
const SECRETO = process.env.MERCADO_PAGO_WEBHOOK_SECRET || 'dev_mercadopago_webhook_change_me'

if (!PEDIDO) {
  console.error(
    'Falta --pedido <ORDER_NUMBER>. Ejemplo:\n' +
      '  node scripts/mercadopago-falso.mjs --pedido PA-2026-ABC --enviar',
  )
  process.exit(1)
}

// ---- La API falsa ----

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PUERTO}`)
  const responder = (codigo, cuerpo) => {
    console.log(`  [api falsa] ${req.method} ${url.pathname} → ${codigo}`)
    res.writeHead(codigo, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(cuerpo))
  }

  if (req.method === 'POST' && url.pathname === '/checkout/preferences') {
    // Se consume el cuerpo aunque no se use: si no, el cliente puede quedarse
    // esperando a que alguien lo lea.
    req.resume()
    return responder(201, {
      id: 'pref-local-001',
      init_point: `http://localhost:${PUERTO}/checkout-simulado`,
      sandbox_init_point: `http://localhost:${PUERTO}/checkout-simulado`,
    })
  }

  if (req.method === 'GET' && url.pathname === `/v1/payments/${ID_PAGO}`) {
    return responder(200, {
      id: Number(ID_PAGO) || ID_PAGO,
      status: ESTADO,
      external_reference: PEDIDO,
      currency_id: 'COP',
    })
  }

  // Cualquier otro id de pago no existe, igual que en la API real.
  if (req.method === 'GET' && url.pathname.startsWith('/v1/payments/')) {
    return responder(404, { message: 'Payment not found' })
  }

  responder(404, { message: 'Ruta no simulada' })
})

// ---- El aviso firmado ----

async function enviarAviso() {
  const ts = String(Math.floor(Date.now() / 1000))
  const requestId = `req-local-${ts}`
  const manifiesto = `id:${ID_PAGO.toLowerCase()};request-id:${requestId};ts:${ts};`
  const v1 = crypto.createHmac('sha256', SECRETO).update(manifiesto).digest('hex')

  const url = `${BACKEND}/api/payments/webhook/mercadopago?data.id=${encodeURIComponent(ID_PAGO)}&type=payment`
  console.log(`\n→ POST ${url}`)
  console.log(`  manifiesto firmado: ${manifiesto}`)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-signature': `ts=${ts},v1=${v1}`,
      'x-request-id': requestId,
    },
    body: JSON.stringify({
      action: 'payment.updated',
      type: 'payment',
      data: { id: ID_PAGO },
    }),
  })

  console.log(`\n← ${res.status} ${await res.text()}`)
}

servidor.listen(PUERTO, async () => {
  console.log(`API falsa de Mercado Pago en http://localhost:${PUERTO}`)
  console.log(`  pedido ${PEDIDO} · pago ${ID_PAGO} · estado "${ESTADO}"`)

  if (!ENVIAR) {
    console.log('\nCorriendo. Añade --enviar para mandar también el aviso al webhook.')
    return
  }

  try {
    await enviarAviso()
  } catch (err) {
    console.error(`\n✖ No se pudo avisar al backend: ${err.message}`)
    console.error('  ¿Está corriendo en', BACKEND, '?')
    process.exitCode = 1
  }
  // El servidor se cierra después del aviso: el backend ya hizo su consulta.
  servidor.close()
})
