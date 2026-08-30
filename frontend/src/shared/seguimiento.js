// Recuerda el último pedido para prellenar la página de seguimiento.
//
// Hace falta porque los medios de pago que sacan al cliente del sitio (PSE,
// Bancolombia) lo devuelven a `track.html` en una carga nueva: el estado de
// React del checkout ya no existe, y Wompi solo agrega el id de la transacción
// a la URL, no el número de pedido. Sin esto, quien acaba de pagar tendría que
// teclear a mano el número que vio un segundo antes.
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
