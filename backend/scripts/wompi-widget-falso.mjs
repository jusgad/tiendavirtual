#!/usr/bin/env node
/**
 * Widget de Wompi simulado, para poder recorrer una compra entera en el
 * navegador sin credenciales de sandbox.
 *
 * El widget real es un script que Wompi sirve desde su dominio y que, sin
 * llaves válidas, no abre. Eso dejaba la mitad visible de la compra sin
 * forma de probarse en local. Esto la devuelve.
 *
 * Sirve dos cosas:
 *
 *   GET  /widget.js   el script que define `window.WidgetCheckout`, con la
 *                     misma forma que el de Wompi: `new WidgetCheckout(cfg)`
 *                     y `.open(callback)`.
 *   POST /simular     lo que llama ese script al elegir desenlace: firma un
 *                     evento `transaction.updated` y se lo manda al webhook
 *                     del backend, igual que haría Wompi.
 *
 * El reparto importa y es el mismo que en la realidad: el navegador solo
 * informa de lo que cree, y la verdad la escribe el webhook por su cuenta.
 * Por eso el paso de pago sigue sondeando el seguimiento después de cerrar
 * el modal — ese comportamiento no se simula, se ejerce.
 *
 * NO sirve para comprobar que tus llaves funcionan. Para eso hace falta el
 * sandbox real de Wompi.
 */

import crypto from 'node:crypto'
import http from 'node:http'

const PUERTO = Number(process.env.PUERTO || 4100)
/** Cómo ve este proceso al backend. Dentro de compose, su nombre de servicio. */
const BACKEND = String(process.env.BACKEND_URL || 'http://127.0.0.1:3000')
const SECRETO = process.env.WOMPI_EVENTS_SECRET || 'dev_wompi_events_change_me'

const PROPIEDADES = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents']

let contador = 0

// ---- El evento firmado ----

const leer = (origen, ruta) =>
  ruta.split('.').reduce((acc, clave) => (acc == null ? undefined : acc[clave]), origen)

async function avisarAlBackend({ referencia, monto, estado, id }) {
  const data = {
    transaction: { id, reference: referencia, status: estado, amount_in_cents: monto },
  }
  const timestamp = Math.floor(Date.now() / 1000)
  const concatenado = PROPIEDADES.map((p) => String(leer(data, p) ?? '')).join('')
  const checksum = crypto
    .createHash('sha256')
    .update(`${concatenado}${timestamp}${SECRETO}`)
    .digest('hex')

  const url = `${BACKEND}/api/payments/webhook/wompi`
  console.log(`→ evento ${estado} del pedido ${referencia} a ${url}`)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'transaction.updated',
      data,
      timestamp,
      signature: { properties: PROPIEDADES, checksum },
    }),
  })
  console.log(`← ${res.status} ${await res.text()}`)
}

// ---- El script que se carga en la página ----

const WIDGET_JS = `/* Widget de Wompi SIMULADO — solo para desarrollo. */
(function () {
  var ORIGEN = document.currentScript
    ? new URL(document.currentScript.src).origin
    : 'http://localhost:${PUERTO}';

  function pesos(centavos) {
    return '$' + Math.round(centavos / 100).toLocaleString('es-CO');
  }

  function WidgetCheckout(config) {
    this.config = config || {};
  }

  WidgetCheckout.prototype.open = function (callback) {
    var cfg = this.config;
    var capa = document.createElement('div');
    capa.setAttribute('role', 'dialog');
    capa.setAttribute('aria-modal', 'true');
    capa.setAttribute('aria-label', 'Pasarela de pago simulada');
    capa.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(17,24,39,.6);' +
      'display:grid;place-items:center;padding:16px;font-family:system-ui,sans-serif';

    capa.innerHTML =
      '<div style="background:#fff;border-radius:16px;padding:28px;max-width:400px;width:100%;' +
      'box-shadow:0 10px 40px rgba(0,0,0,.25)">' +
        '<div style="background:#FEF3C7;color:#92400E;border-radius:10px;padding:10px 12px;' +
        'font-size:13px;font-weight:700;margin-bottom:18px">' +
          '&#9888;&#65039; Widget SIMULADO &mdash; no se cobra dinero' +
        '</div>' +
        '<p style="margin:0 0 4px;font-size:13px;color:#6b7280">Pedido ' +
          (cfg.reference || '') + '</p>' +
        '<p style="margin:0 0 22px;font-size:30px;font-weight:800">' +
          pesos(cfg.amountInCents || 0) + ' <span style="font-size:14px;color:#6b7280">' +
          (cfg.currency || '') + '</span></p>' +
        '<button data-estado="APPROVED" style="width:100%;border:0;color:#fff;background:#2E7D32;' +
        'font-weight:700;font-size:15px;padding:13px;border-radius:10px;cursor:pointer;' +
        'margin-bottom:10px">Aprobar el pago</button>' +
        '<button data-estado="DECLINED" style="width:100%;border:0;color:#fff;background:#C62828;' +
        'font-weight:700;font-size:15px;padding:13px;border-radius:10px;cursor:pointer;' +
        'margin-bottom:10px">Rechazar el pago</button>' +
        '<button data-estado="" style="width:100%;border:1px solid #d1d5db;background:#fff;' +
        'color:#374151;font-weight:700;font-size:15px;padding:13px;border-radius:10px;' +
        'cursor:pointer">Cerrar sin pagar</button>' +
        '<p style="margin:14px 0 0;font-size:12px;color:#9ca3af;line-height:1.5">' +
          'Al elegir se firma el evento igual que lo har&iacute;a Wompi y se manda al webhook. ' +
          'La confirmaci&oacute;n la escribe el backend, no esta ventana.' +
        '</p>' +
      '</div>';

    document.body.appendChild(capa);

    capa.addEventListener('click', function (e) {
      var boton = e.target.closest('button[data-estado]');
      if (!boton) return;
      var estado = boton.getAttribute('data-estado');
      capa.remove();

      // Cerrar sin pagar: el widget real resuelve sin transacción.
      if (!estado) return callback({});

      var id = 'txn-sim-' + Date.now();
      fetch(ORIGEN + '/simular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referencia: cfg.reference,
          monto: cfg.amountInCents,
          estado: estado,
          id: id
        })
      }).catch(function () { /* el sondeo del checkout lo acabará notando */ });

      // Como el real: devuelve lo que cree, no una prueba de pago.
      callback({ transaction: { id: id, status: estado, reference: cfg.reference } });
    });
  };

  window.WidgetCheckout = WidgetCheckout;
})();
`

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
  const url = new URL(req.url, `http://localhost:${PUERTO}`)

  // El script lo carga el frontend desde otro puerto: sin CORS no arranca.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  if (req.method === 'GET' && url.pathname === '/widget.js') {
    console.log('  [widget falso] GET /widget.js → 200')
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' })
    return res.end(WIDGET_JS)
  }

  if (req.method === 'POST' && url.pathname === '/simular') {
    const datos = JSON.parse((await leerCuerpo(req)) || '{}')
    const estado = datos.estado === 'DECLINED' ? 'DECLINED' : 'APPROVED'
    const id = String(datos.id || `txn-sim-${++contador}`)
    res.writeHead(202, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ aceptado: true, id }))

    // Después de responder: el navegador no tiene que esperar al webhook,
    // igual que con Wompi. El checkout se entera sondeando el seguimiento.
    try {
      await avisarAlBackend({
        referencia: String(datos.referencia || ''),
        monto: Number(datos.monto || 0),
        estado,
        id,
      })
    } catch (err) {
      console.error(`  ✖ el backend no respondió: ${err.message}`)
    }
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ message: 'Ruta no simulada' }))
})

servidor.listen(PUERTO, '0.0.0.0', () => {
  console.log(`Widget de Wompi simulado en http://localhost:${PUERTO}/widget.js`)
  console.log(`  avisará al backend en ${BACKEND}`)
})
