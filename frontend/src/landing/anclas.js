/**
 * Huecos que la maquetación reserva para el producto.
 *
 * Un estado con `ancla` no coloca el producto en una coordenada fija de la
 * escena, sino sobre el elemento `[data-ancla-producto="…"]` de la página.
 * Ese elemento ocupa su sitio en el flujo y se desplaza con el texto, así
 * que el producto que lo sigue no puede pisar texto: el hueco ya está vacío
 * por construcción, mida lo que mida la pantalla.
 *
 * Puede haber varios elementos con el mismo nombre —el cierre tiene uno
 * para móvil y otro para escritorio, cada uno oculto en el otro tamaño—;
 * vale el primero que tenga tamaño.
 */
export function rectAncla(nombre) {
  if (typeof document === 'undefined' || !nombre) return null
  for (const el of document.querySelectorAll(`[data-ancla-producto="${nombre}"]`)) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return r
  }
  return null
}

/** Centro de un rectángulo en píxeles de la ventana. */
export const centro = (r) => [r.left + r.width / 2, r.top + r.height / 2]
