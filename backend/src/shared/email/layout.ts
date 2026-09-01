/**
 * Armazón HTML de los correos y utilidades de formato.
 *
 * Todo va con estilos en línea y tablas: los clientes de correo (Gmail,
 * Outlook, Apple Mail) ignoran hojas de estilo externas y buena parte de CSS
 * moderno. Nada de flexbox ni grid aquí, por feo que se vea el código.
 */

const MARCA = '#FF8A3D'
const TEXTO = '#3A2A1A'
const SUAVE = '#8A6A4A'
const BORDE = '#E7D9C4'
const FONDO = '#FFF9F0'

/** Escapa lo que venga de la base de datos antes de meterlo en el HTML. */
export function escapar(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Pesos colombianos sin decimales: "$ 79.900". */
export function pesos(valor: number): string {
  return `$ ${Math.round(valor).toLocaleString('es-CO')}`
}

export interface Boton {
  texto: string
  url: string
}

/**
 * Envuelve el contenido en la plantilla de la tienda.
 *
 * `contenido` ya viene en HTML y se inserta tal cual: es responsabilidad de
 * quien lo compone haber escapado los datos con `escapar`.
 */
export function envolver({
  titulo,
  contenido,
  boton,
}: {
  titulo: string
  contenido: string
  boton?: Boton
}): string {
  const botonHtml = boton
    ? `<tr><td style="padding:8px 0 4px">
         <a href="${escapar(boton.url)}" style="display:inline-block;background:${MARCA};color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:100px">${escapar(boton.texto)}</a>
       </td></tr>`
    : ''

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:${FONDO};font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TEXTO}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FONDO};padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${BORDE};border-radius:16px;padding:28px">
        <tr><td style="font-size:22px;font-weight:bold;padding-bottom:14px">${escapar(titulo)}</td></tr>
        <tr><td style="font-size:15px;line-height:1.6">${contenido}</td></tr>
        ${botonHtml}
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;padding:16px 4px">
        <tr><td style="font-size:12px;color:${SUAVE};line-height:1.5">
          PomAss · Hecho con amor en Colombia<br>
          Este correo se envía automáticamente; no hace falta responderlo.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

/** Tabla de artículos del pedido, con su total. */
export function tablaArticulos(
  items: { productName: string; quantity: number; lineTotal: number }[],
  total: number,
): string {
  const filas = items
    .map(
      (i) =>
        `<tr>
           <td style="padding:6px 0;border-bottom:1px solid ${BORDE}">${escapar(i.productName)} × ${i.quantity}</td>
           <td style="padding:6px 0;border-bottom:1px solid ${BORDE};text-align:right;white-space:nowrap">${pesos(i.lineTotal)}</td>
         </tr>`,
    )
    .join('')

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:14px 0">
    ${filas}
    <tr>
      <td style="padding:10px 0;font-weight:bold">Total</td>
      <td style="padding:10px 0;font-weight:bold;text-align:right;white-space:nowrap">${pesos(total)}</td>
    </tr>
  </table>`
}

/** Misma información que el HTML, en texto plano. */
export function articulosEnTexto(
  items: { productName: string; quantity: number; lineTotal: number }[],
  total: number,
): string {
  const lineas = items.map((i) => `- ${i.productName} x ${i.quantity}: ${pesos(i.lineTotal)}`)
  return [...lineas, `Total: ${pesos(total)}`].join('\n')
}
