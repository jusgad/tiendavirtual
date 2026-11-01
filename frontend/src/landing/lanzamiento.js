import { formatCOP } from '../shared/format.js'
import { LANZAMIENTO_HASTA, LANZAMIENTO_TEXTO, PRECIO_REGULAR } from '../site.js'

/**
 * ¿Hay que enseñar el precio regular tachado al lado del actual?
 *
 * Recibe el precio ya formateado que está en pantalla (el de la API, o el de
 * respaldo mientras llega) y devuelve `null` cuando NO toca tachar nada. Es
 * una función pura para poder probar las tres condiciones sin montar React.
 *
 * Tacha solo si se cumplen las tres:
 *
 * 1. El precio en pantalla se entiende como un número. Si no, no se compara
 *    nada: antes tachar de más que inventar.
 * 2. Ese precio es MENOR que el regular. Si el panel sube el combo a 117.500 o
 *    más, el descuento ya no existe y el tachado se iría solo.
 * 3. La fecha de lanzamiento no ha pasado. Pasada, el tachado desaparece
 *    aunque el panel se haya olvidado de subir el precio: un «antes» que
 *    nunca llega a cobrarse es un descuento falso.
 *
 * Lee los dígitos del texto en vez de pedir el número aparte porque el formato
 * COP no lleva decimales: «$89.900» → 89900, y así da igual de dónde venga el
 * precio.
 */
export function ofertaLanzamiento(precioTexto, ahora = new Date()) {
  const actual = Number(String(precioTexto ?? '').replace(/\D/g, ''))
  if (!Number.isFinite(actual) || actual <= 0) return null
  if (actual >= PRECIO_REGULAR) return null
  if (ahora.getTime() > new Date(LANZAMIENTO_HASTA).getTime()) return null

  return {
    antes: formatCOP(PRECIO_REGULAR).replace(/\s/g, ''),
    ahorro: formatCOP(PRECIO_REGULAR - actual).replace(/\s/g, ''),
    nota: LANZAMIENTO_TEXTO,
  }
}
