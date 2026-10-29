// Recuerda el último pedido para prellenar la página de seguimiento.
//
// Hace falta porque se paga fuera del sitio: Mercado Pago devuelve a la
// clienta a `track.html` en una carga nueva, donde el estado de React del
// checkout ya no existe. Mercado Pago sí pone el número de pedido en la URL
// (`external_reference`), pero no el correo, y el seguimiento pide los dos.
// Sin esto, quien acaba de pagar tendría que teclearlo a mano.
//
// No es una credencial: son los mismos dos datos que el cliente puede escribir
// en el formulario. Guardarlos solo ahorra tecleo.

const CLAVE = 'pomass_ultimo_pedido'

/** Guarda el pedido recién creado. Silencioso si `localStorage` no está disponible. */
export function recordarPedido(orderNumber, email) {
  if (!orderNumber || !email) return
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ orderNumber, email }))
  } catch {
    // Navegación privada o almacenamiento bloqueado: el formulario sigue sirviendo.
  }
}

/** Devuelve `{ orderNumber, email }` o `null` si no hay nada recordado. */
export function leerPedidoRecordado() {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return null
    const datos = JSON.parse(crudo)
    return datos?.orderNumber && datos?.email ? datos : null
  } catch {
    return null
  }
}

export function olvidarPedido() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // Nada que hacer.
  }
}
