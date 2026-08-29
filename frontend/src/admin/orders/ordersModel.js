// Lógica pura de la sección de pedidos: etiquetas, tonos y paginación.
// Se mantiene aparte de los componentes para poder probarla sin montar React.

const ETIQUETAS = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  PREPARING: 'En preparación',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
}

const TONOS = {
  PENDING: 'bg-[#FFF3DE] text-[#8A6A4A]',
  PAID: 'bg-emerald-50 text-emerald-700',
  PREPARING: 'bg-sky-50 text-sky-700',
  SHIPPED: 'bg-indigo-50 text-indigo-700',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-50 text-red-700',
}

/** Opciones del filtro. La primera no filtra nada. */
export const ESTADOS = [
  { value: '', label: 'Todos' },
  ...Object.entries(ETIQUETAS).map(([value, label]) => ({ value, label })),
]

export function etiquetaEstado(status) {
  return ETIQUETAS[status] ?? status
}

export function tonoEstado(status) {
  return TONOS[status] ?? 'bg-gray-100 text-gray-700'
}

/** Nº de páginas. Siempre al menos 1, para no mostrar "página 1 de 0". */
export function totalPaginas(total, pageSize) {
  return Math.max(1, Math.ceil(total / pageSize))
}

const ACCIONES = {
  PREPARING: 'Marcar en preparación',
  SHIPPED: 'Marcar enviado',
  DELIVERED: 'Marcar entregado',
  CANCELLED: 'Cancelar pedido',
}

/**
 * Traduce a botones el `allowedTransitions` que devuelve el backend.
 * La regla de qué transiciones caben NO se duplica aquí: es del servidor.
 */
export function accionesPara(allowedTransitions = []) {
  return allowedTransitions.map((status) => ({
    status,
    label: ACCIONES[status] ?? etiquetaEstado(status),
    esEnvio: status === 'SHIPPED',
    esCancelacion: status === 'CANCELLED',
  }))
}

/**
 * ¿Están completos los datos de despacho? El backend los exige al pasar a
 * SHIPPED; esto solo evita mandar una petición que se sabe que va a fallar.
 */
export function envioCompleto({ carrier, trackingNumber } = {}) {
  return Boolean(carrier?.trim() && trackingNumber?.trim())
}
