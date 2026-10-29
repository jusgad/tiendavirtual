#!/usr/bin/env node
/**
 * Doble local de Mercado Pago, para probar el flujo de pagos entero sin
 * internet, sin túnel y sin una cuenta de sandbox.
 *
 * Hace falta porque Mercado Pago no manda el resultado dentro del aviso: el
 * aviso solo trae el id del pago, y el backend va a preguntar en qué quedó.
 * Eso significa que ya no basta con firmarse un evento a uno mismo — hay que
 * tener algo que conteste esa consulta. Esto es ese algo.
 *
 * Imita los dos endpoints que el backend usa, más la página de pago:
 *
 *   POST /checkout/preferences   → crea la preferencia y devuelve su init_point
 *   GET  /checkout-simulado      → la "pasarela": Aprobar / Rechazar / Pendiente
 *   GET  /v1/payments/:id        → el pago, con el estado que se haya elegido
 *
 * ## Modo servidor (el de `docker compose`)
 *
 *     node scripts/mercadopago-falso.mjs
 *
 * Queda escuchando. Cuando la clienta le da a «Pagar» en el checkout, el
 * navegador aterriza aquí: eliges el desenlace, se firma el aviso igual que
 * lo haría Mercado Pago, se le manda al webhook del backend y se te devuelve
 * al seguimiento del pedido. Es el recorrido real, de principio a fin.
 *
 * ## Modo de una sola vez (para la guía con curl)
 *
 *     node scripts/mercadopago-falso.mjs --pedido PA-2026-ABC --enviar
 *
 * Registra un pago para ese pedido, manda el aviso firmado y sale.
 *
 * NO sirve para verificar que tus credenciales reales funcionan: para eso hay
 * que ir al sandbox de verdad. Sirve para verificar que TU backend hace lo que
 * debe con lo que Mercado Pago le diría.
 */

import crypto from 'node:crypto'
import http from 'node:http'

// ---- Configuración ----

function arg(nombre, pordefecto) {
  const i = process.argv.indexOf(`--${nombre}`)
  if (i === -1) return pordefecto
  const siguiente = process.argv[i + 1]
  return siguiente && !siguiente.startsWith('--') ? siguiente : true
}

const PUERTO = Number(arg('puerto', process.env.PUERTO || 4100))
/** Cómo me ve el NAVEGADOR. Dentro de compose no es mi nombre de servicio. */
const URL_PUBLICA = String(arg('url-publica', process.env.URL_PUBLICA || `http://localhost:${PUERTO}`))
/** Cómo veo yo al BACKEND. Dentro de compose sí es su nombre de servicio. */
const BACKEND = String(arg('backend', process.env.BACKEND_URL || 'http://127.0.0.1:3000'))
const SECRETO = process.env.MERCADO_PAGO_WEBHOOK_SECRET || 'dev_mercadopago_webhook_change_me'

// Modo de una sola vez.
const PEDIDO = arg('pedido', null)
const ESTADO = String(arg('estado', 'approved'))
const ID_PAGO = String(arg('id-pago', '111222333'))
const ENVIAR = Boolean(arg('enviar', false))

// ---- Memoria ----

/** preferenceId -> { reference, amount, currency, backUrl, notificationUrl } */
const preferencias = new Map()
/** paymentId -> { status, external_reference } */
const pagos = new Map()

let contador = 0
const nuevoId = (prefijo) => `${prefijo}-${Date.now()}-${++contador}`

const ESTADOS = [
  ['approved', 'Aprobar el pago', '#2E7D32'],
  ['rejected', 'Rechazar el pago', '#C62828'],
  ['pending', 'Dejarlo pendiente', '#EF6C00'],
]

// ---- Firma y aviso ----

/**
 * Manifiesto que Mercado Pago firma:
 *   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 * Los tramos que no vengan se omiten enteros, y el id va en minúsculas.
 */
function manifiesto(dataId, requestId, ts) {
  const tramos = []
  if (dataId) tramos.push(`id:${dataId.toLowerCase()};`)
  if (requestId) tramos.push(`request-id:${requestId};`)
  if (ts) tramos.push(`ts:${ts};`)
  return tramos.join('')
}

async function avisarAlBackend(idPago, notificationUrl) {
  const ts = String(Math.floor(Date.now() / 1000))
  const requestId = `req-local-${ts}-${contador}`
  const firma = crypto.createHmac('sha256', SECRETO).update(manifiesto(idPago, requestId, ts)).digest('hex')

  const base = notificationUrl || `${BACKEND}/api/payments/webhook/mercadopago`
  const url = `${base}?data.id=${encodeURIComponent(idPago)}&type=payment`

  console.log(`→ aviso del pago ${idPago} a ${url}`)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-signature': `ts=${ts},v1=${firma}`,
      'x-request-id': requestId,
    },
    body: JSON.stringify({ action: 'payment.updated', type: 'payment', data: { id: idPago } }),
  })
  const cuerpo = await res.text()
  console.log(`← ${res.status} ${cuerpo}`)
  return { status: res.status, cuerpo }
}

// ---- La pasarela simulada ----

const escapar = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const formatoCOP = (n) =>
  typeof n === 'number' ? `$${n.toLocaleString('es-CO')}` : String(n ?? '')

function paginaDePago(prefId, pref) {
  const botones = ESTADOS.map(
    ([valor, etiqueta, color]) => `
      <form method="POST" action="/simular">
        <input type="hidden" name="pref" value="${escapar(prefId)}">
        <input type="hidden" name="estado" value="${valor}">
        <button type="submit" style="background:${color}">${etiqueta}</button>
      </form>`,
  ).join('')

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pasarela simulada · PomAss</title>
<style>
  :root { color-scheme: light }
  body { font-family: system-ui, sans-serif; background:#f3f4f6; margin:0;
         min-height:100vh; display:grid; place-items:center; padding:16px }
  .caja { background:#fff; border-radius:16px; padding:28px; max-width:420px; width:100%;
          box-shadow:0 10px 30px rgba(0,0,0,.08) }
  .aviso { background:#FEF3C7; color:#92400E; border-radius:10px; padding:10px 12px;
           font-size:13px; font-weight:700; margin-bottom:18px }
  h1 { font-size:19px; margin:0 0 4px }
  .ref { color:#6b7280; font-size:13px; margin:0 0 14px }
  .monto { font-size:30px; font-weight:800; margin:0 0 22px }
  button { width:100%; border:0; color:#fff; font-weight:700; font-size:15px;
           padding:13px; border-radius:10px; cursor:pointer; margin-bottom:10px }
  button:hover { filter:brightness(.93) }
  .pie { color:#9ca3af; font-size:12px; margin-top:8px; line-height:1.5 }
</style></head>
<body><div class="caja">
  <div class="aviso">⚠️ Pasarela SIMULADA — no se cobra dinero</div>
  <h1>Pedido ${escapar(pref.reference)}</h1>
  <p class="ref">Preferencia ${escapar(prefId)}</p>
  <p class="monto">${escapar(formatoCOP(pref.amount))} ${escapar(pref.currency || '')}</p>
  ${botones}
  <p class="pie">Al elegir, se firma el aviso igual que lo haría Mercado Pago, se manda
  al webhook del backend y vuelves al seguimiento del pedido.</p>
</div></body></html>`
}

// ---- Servidor ----

function leerCuerpo(req) {
  return new Promise((resolve) => {
    let datos = ''
    req.on('data', (c) => {
      datos += c
      if (datos.length > 1e6) req.destroy()
    })
    req.on('end', () => resolve(datos))
  })
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, URL_PUBLICA)
  const json = (codigo, cuerpo) => {
    console.log(`  [mp falso] ${req.method} ${url.pathname} → ${codigo}`)
    res.writeHead(codigo, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(cuerpo))
  }

  // --- Crear la preferencia ---
  if (req.method === 'POST' && url.pathname === '/checkout/preferences') {
    const cuerpo = JSON.parse((await leerCuerpo(req)) || '{}')
    const item = cuerpo.items?.[0] ?? {}
    const id = nuevoId('pref')
    preferencias.set(id, {
      reference: cuerpo.external_reference ?? item.id ?? '(sin referencia)',
      amount: item.unit_price,
      currency: item.currency_id,
      backUrl: cuerpo.back_urls?.success ?? null,
      notificationUrl: cuerpo.notification_url ?? null,
    })
    const initPoint = `${URL_PUBLICA}/checkout-simulado?pref=${encodeURIComponent(id)}`
    return json(201, { id, init_point: initPoint, sandbox_init_point: initPoint })
  }

  // --- La página de pago ---
  if (req.method === 'GET' && url.pathname === '/checkout-simulado') {
    const prefId = url.searchParams.get('pref')
    const pref = prefId ? preferencias.get(prefId) : null
    if (!pref) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
      return res.end('<p>Esa preferencia no existe. ¿Se reinició el doble de Mercado Pago?</p>')
    }
    console.log(`  [mp falso] GET /checkout-simulado (${pref.reference}) → 200`)
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    return res.end(paginaDePago(prefId, pref))
  }

  // --- Elegir el desenlace: firma, avisa y devuelve al seguimiento ---
  if (req.method === 'POST' && url.pathname === '/simular') {
    const datos = new URLSearchParams(await leerCuerpo(req))
    const pref = preferencias.get(datos.get('pref'))
    if (!pref) return json(404, { message: 'preferencia desconocida' })

    const estado = datos.get('estado') || 'approved'
    const idPago = nuevoId('pago').replace(/\D/g, '') || String(Date.now())
    pagos.set(idPago, { status: estado, external_reference: pref.reference })

    try {
      await avisarAlBackend(idPago, pref.notificationUrl)
    } catch (err) {
      console.error(`  ✖ el backend no respondió: ${err.message}`)
    }

    // Mercado Pago vuelve con sus propios parámetros en la URL.
    const destino = new URL(pref.backUrl || `${URL_PUBLICA}/checkout-simulado`)
    destino.searchParams.set('payment_id', idPago)
    destino.searchParams.set('status', estado)
    destino.searchParams.set('external_reference', pref.reference)
    console.log(`  [mp falso] pago ${idPago} (${estado}) → vuelta a ${destino.origin}${destino.pathname}`)
    res.writeHead(302, { Location: destino.toString() })
    return res.end()
  }

  // --- Consultar el pago (lo que hace el backend tras el aviso) ---
  if (req.method === 'GET' && url.pathname.startsWith('/v1/payments/')) {
    const id = decodeURIComponent(url.pathname.slice('/v1/payments/'.length))
    const pago = pagos.get(id)
    // Un id desconocido no existe, igual que en la API real.
    if (!pago) return json(404, { message: 'Payment not found' })
    return json(200, { id, status: pago.status, external_reference: pago.external_reference, currency_id: 'COP' })
  }

  json(404, { message: 'Ruta no simulada' })
})

servidor.listen(PUERTO, '0.0.0.0', async () => {
  console.log(`Mercado Pago falso escuchando en ${URL_PUBLICA} (puerto ${PUERTO})`)
  console.log(`  avisará al backend en ${BACKEND}`)

  if (!ENVIAR) {
    console.log('  modo servidor: el checkout traerá aquí al navegador cuando pagues.')
    return
  }

  // Modo de una sola vez: registra el pago, avisa y sale.
  if (!PEDIDO) {
    console.error('Con --enviar hace falta --pedido <ORDER_NUMBER>.')
    process.exitCode = 1
    return servidor.close()
  }
  pagos.set(ID_PAGO, { status: ESTADO, external_reference: PEDIDO })
  console.log(`  pedido ${PEDIDO} · pago ${ID_PAGO} · estado "${ESTADO}"\n`)
  try {
    await avisarAlBackend(ID_PAGO, null)
  } catch (err) {
    console.error(`\n✖ No se pudo avisar al backend: ${err.message}`)
    console.error(`  ¿Está corriendo en ${BACKEND}?`)
    process.exitCode = 1
  }
  servidor.close()
})
