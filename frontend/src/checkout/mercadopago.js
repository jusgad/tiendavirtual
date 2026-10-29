// Salida hacia el checkout de Mercado Pago.
//
// No hay widget que cargar ni script externo: el backend ya creó la
// «preferencia» de pago contra la API de Mercado Pago y nos devolvió una URL.
// Lo único que hace el navegador es ir allí. El monto vive del lado de Mercado
// Pago, así que no hay nada que firmar ni nada que se pueda alterar desde aquí.
//
// Al terminar, Mercado Pago devuelve a la clienta a `track.html` (la URL se
// configura en el backend, en `MERCADO_PAGO_BACK_URL`). La confirmación real
// no llega por ese redirect sino por el webhook: el seguimiento del pedido es
// el que dice la verdad.

/** ¿El backend tiene credenciales de Mercado Pago configuradas? */
export function estaConfigurado(checkout) {
  return Boolean(checkout?.configured && checkout?.initPoint)
}

/**
 * Manda el navegador al checkout de Mercado Pago.
 *
 * Se usa `assign` y no `replace` a propósito: así el botón «atrás» del
 * navegador devuelve al checkout de la tienda si la clienta se arrepiente.
 */
export function irAMercadoPago(checkout, ventana = window) {
  if (!estaConfigurado(checkout)) {
    throw new Error('El pago no está configurado todavía')
  }
  ventana.location.assign(checkout.initPoint)
}
