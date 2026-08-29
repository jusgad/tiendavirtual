// Formato de moneda y fecha para Colombia. Lo comparten checkout y panel.

export function formatCOP(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Fecha corta legible: "1 ago 2026, 10:00". Acepta Date o string ISO. */
export function formatFecha(valor) {
  const fecha = valor instanceof Date ? valor : new Date(valor)
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(fecha)
}
