// Lógica pura de cupones: conversión, validación y el estado que se muestra.
import { formatCOP } from '../../shared/format.js'

export function formularioVacioCupon() {
  return {
    code: '',
    type: 'PERCENTAGE',
    value: '',
    minPurchase: '',
    maxUses: '',
    perUserLimit: '',
    startsAt: '',
    endsAt: '',
    isActive: true,
  }
}

/** Pasa un cupón de la API al formulario. Las fechas se recortan a YYYY-MM-DD. */
export function cuponAFormulario(c) {
  const texto = (v) => (v == null ? '' : String(v))
  const fecha = (v) => (v ? String(v).slice(0, 10) : '')
  return {
    code: texto(c.code),
    type: c.type ?? 'PERCENTAGE',
    value: texto(c.value),
    minPurchase: texto(c.minPurchase),
    maxUses: texto(c.maxUses),
    perUserLimit: texto(c.perUserLimit),
    startsAt: fecha(c.startsAt),
    endsAt: fecha(c.endsAt),
    isActive: c.isActive !== false,
  }
}

export function validarCupon(f) {
  const errores = {}

  if (!f.code?.trim() || f.code.trim().length < 3) {
    errores.code = 'El código debe tener al menos 3 caracteres'
  }

  const valor = Number(f.value)
  if (!f.value?.trim() || !Number.isFinite(valor) || valor <= 0) {
    errores.value = 'El valor debe ser mayor que cero'
  } else if (f.type === 'PERCENTAGE' && valor > 100) {
    errores.value = 'Un descuento porcentual no puede pasar de 100'
  }

  if (f.startsAt && f.endsAt && f.startsAt >= f.endsAt) {
    errores.endsAt = 'La fecha de fin debe ser posterior a la de inicio'
  }

  return errores
}

/**
 * Cuerpo para la API. `esNuevo` importa: `updateCouponSchema` no acepta `code`,
 * porque un cupón ya repartido no se puede renombrar sin romper a quien lo tenga.
 */
export function formularioAPayloadCupon(f, { esNuevo }) {
  const numero = (v) => (v?.trim() ? Number(v) : undefined)
  const payload = {
    type: f.type,
    value: Number(f.value),
    isActive: f.isActive,
  }

  if (esNuevo) payload.code = f.code.trim().toUpperCase()

  const min = numero(f.minPurchase)
  if (min !== undefined) payload.minPurchase = min
  const max = numero(f.maxUses)
  if (max !== undefined) payload.maxUses = max
  const porUsuario = numero(f.perUserLimit)
  if (porUsuario !== undefined) payload.perUserLimit = porUsuario
  if (f.startsAt) payload.startsAt = f.startsAt
  if (f.endsAt) payload.endsAt = f.endsAt

  return payload
}

export function descripcionDescuento(c) {
  return c.type === 'PERCENTAGE' ? `${c.value} % de descuento` : `${formatCOP(c.value)} de descuento`
}

/** Estado que se muestra en la lista, con su tono. */
export function estadoCupon(c, ahora = new Date()) {
  if (!c.isActive) return { etiqueta: 'Desactivado', tono: 'bg-gray-100 text-gray-600' }
  if (c.startsAt && new Date(c.startsAt) > ahora) {
    return { etiqueta: 'Programado', tono: 'bg-sky-50 text-sky-700' }
  }
  if (c.endsAt && new Date(c.endsAt) < ahora) {
    return { etiqueta: 'Expirado', tono: 'bg-red-50 text-red-700' }
  }
  if (c.maxUses != null && (c.usedCount ?? 0) >= c.maxUses) {
    return { etiqueta: 'Agotado', tono: 'bg-amber-50 text-amber-700' }
  }
  return { etiqueta: 'Vigente', tono: 'bg-emerald-50 text-emerald-700' }
}
