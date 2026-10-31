import { TRAYECTORIAS, TRAYECTORIAS_LIGERAS } from './curvas.js'

/**
 * Cuánta escena puede pintar este equipo.
 *
 * Dos niveles, no una escala continua: con dos es fácil comprobar que los
 * dos se ven bien. El bajo es el que pide el prompt para móvil y equipos
 * lentos, y es también al que se cae si el monitor de rendimiento detecta
 * que no se llega a los fotogramas.
 *
 * `reducido` es aparte del nivel: alguien con un equipo potente puede haber
 * pedido menos movimiento, y eso no tiene que ver con la potencia.
 */
export function construirCalidad({ movil = false, lento = false, reducido = false } = {}) {
  const baja = movil || lento
  return {
    nivel: baja ? 'baja' : 'alta',
    movil,
    reducido,
    velos: baja ? TRAYECTORIAS_LIGERAS : TRAYECTORIAS.map((t) => t.id),
    segmentos: baja ? 120 : 220,
    particulasVolumen: baja ? 320 : 900,
    particulasCorriente: baja ? 260 : 700,
    petalos: movil ? 3 : 6,
    // El campo de viento es la capa más cara por píxel.
    resolucionCampo: lento ? 1 / 3 : 1 / 2,
    dpr: baja ? [1, 1.25] : [1, 1.75],
    // Con menos movimiento la escena no se para: se calma.
    tiempo: reducido ? 0.13 : 1,
    rafaga: !reducido,
    puntero: !movil && !reducido,
  }
}

/** La calidad a la que se baja cuando el equipo no da abasto. */
export function bajarCalidad(calidad) {
  return { ...construirCalidad({ movil: calidad.movil, lento: true, reducido: calidad.reducido }), dpr: [1, 1] }
}

/** Lee el equipo actual. Solo en el navegador. */
export function detectarCalidad() {
  const consulta = (q) => typeof window !== 'undefined' && Boolean(window.matchMedia?.(q).matches)
  const nucleos = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency ?? 8) : 8
  const memoria = typeof navigator !== 'undefined' ? (navigator.deviceMemory ?? 8) : 8
  return construirCalidad({
    movil: consulta('(max-width: 899px)'),
    lento: nucleos <= 4 || memoria <= 4,
    reducido: consulta('(prefers-reduced-motion: reduce)'),
  })
}
