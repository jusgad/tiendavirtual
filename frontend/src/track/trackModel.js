// Lógica pura de la página de seguimiento: la línea de tiempo del pedido.
// Se mantiene aparte del componente para poder probarla sin montar React
// (Vitest corre en entorno node, sin DOM).

/** Avance normal de un pedido, en orden. `CANCELLED` no vive aquí: ver `esCancelado`. */
export const PASOS = [
  {
    status: 'PENDING',
    label: 'Pendiente',
    descripcion: 'Estamos esperando la confirmación del pago.',
  },
  {
    status: 'PAID',
    label: 'Pagado',
    descripcion: 'Recibimos tu pago. Ya vamos a preparar tu pedido.',
  },
  {
    status: 'PREPARING',
    label: 'En preparación',
    descripcion: 'Estamos empacando tu pedido.',
  },
  {
    status: 'SHIPPED',
    label: 'Enviado',
    descripcion: 'Tu pedido va en camino.',
  },
  {
    status: 'DELIVERED',
    label: 'Entregado',
    descripcion: '¡Tu pedido llegó! Gracias por comprar en PomAss.',
  },
]

/** Un pedido cancelado se sale de la línea de tiempo: no la recorre, la abandona. */
export function esCancelado(status) {
  return status === 'CANCELLED'
}

/** Posición del estado dentro de `PASOS`. -1 si está cancelado o no se reconoce. */
export function indicePaso(status) {
  return PASOS.findIndex((p) => p.status === status)
}

/**
 * La línea de tiempo con el avance marcado. Cada paso queda como
 * `completado`, `actual` o `pendiente`.
 */
export function pasosConEstado(status) {
  const actual = indicePaso(status)

  return PASOS.map((paso, i) => ({
    ...paso,
    estado: i < actual ? 'completado' : i === actual ? 'actual' : 'pendiente',
  }))
}

/**
 * ¿Conviene volver a consultar? Solo mientras el pago no se haya confirmado:
 * el webhook de Mercado Pago puede tardar unos segundos en llegar, y hasta
 * que llega
 * el pedido sigue en PENDING aunque el cliente ya haya pagado.
 */
export function esperaConfirmacion(status) {
  return status === 'PENDING'
}
