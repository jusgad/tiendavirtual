/**
 * Lectura de la silueta de un tubo a partir de su foto frontal.
 *
 * La etiqueta del modelo 3D es la foto real del producto: es la única forma
 * de no inventarse el packaging. Para que esa foto caiga exactamente sobre la
 * geometría hace falta saber, fila a fila, dónde empieza y dónde acaba el
 * tubo en la imagen. Eso es lo que mide este archivo.
 *
 * No importa Three ni el DOM: recibe los píxeles y devuelve números. Así se
 * puede probar con imágenes sintéticas.
 */

/** Opacidad a partir de la cual un píxel cuenta como parte del tubo. */
const UMBRAL_ALFA = 128

/**
 * Mide el borde izquierdo y derecho de la silueta en cada fila.
 *
 * @param {Uint8ClampedArray} datos  RGBA, como los da `getImageData`
 * @returns {{ ancho, alto, izquierda: Int16Array, derecha: Int16Array,
 *            primera: number, ultima: number }}
 *   `izquierda[y] = -1` en las filas sin nada opaco.
 */
export function medirSilueta(datos, ancho, alto) {
  const izquierda = new Int16Array(alto).fill(-1)
  const derecha = new Int16Array(alto).fill(-1)
  let primera = -1
  let ultima = -1

  for (let y = 0; y < alto; y++) {
    const fila = y * ancho * 4
    let x0 = -1
    let x1 = -1
    for (let x = 0; x < ancho; x++) {
      if (datos[fila + x * 4 + 3] > UMBRAL_ALFA) {
        if (x0 < 0) x0 = x
        x1 = x
      }
    }
    if (x0 >= 0) {
      izquierda[y] = x0
      derecha[y] = x1
      if (primera < 0) primera = y
      ultima = y
    }
  }

  return { ancho, alto, izquierda, derecha, primera, ultima }
}

/**
 * Bordes de la silueta en una fila fraccionaria, interpolando entre las dos
 * filas enteras que la rodean. Las coordenadas de textura salen de aquí, y
 * redondear a fila entera dejaría escalones visibles en la etiqueta.
 */
export function bordesEn(silueta, fila) {
  const { izquierda, derecha, primera, ultima } = silueta
  const f = Math.min(Math.max(fila, primera), ultima)
  const y0 = Math.floor(f)
  const y1 = Math.min(y0 + 1, ultima)
  const t = f - y0
  // Una fila vacía en medio (un píxel suelto transparente) no debe hundir el
  // borde: se toma la vecina.
  const a0 = izquierda[y0] >= 0 ? izquierda[y0] : izquierda[y1]
  const a1 = izquierda[y1] >= 0 ? izquierda[y1] : a0
  const b0 = derecha[y0] >= 0 ? derecha[y0] : derecha[y1]
  const b1 = derecha[y1] >= 0 ? derecha[y1] : b0
  return [a0 + (a1 - a0) * t, b0 + (b1 - b0) * t]
}

/** ¿Este píxel es gris claro? Las tapas de los tubos son blancas. */
function esGrisClaro(datos, i) {
  const r = datos[i]
  const g = datos[i + 1]
  const b = datos[i + 2]
  return Math.abs(r - g) < 16 && Math.abs(g - b) < 16 && r > 150
}

/**
 * Busca dónde empieza la tapa: la primera fila, bajando desde la mitad,
 * en la que la franja pegada al borde izquierdo es casi toda gris.
 *
 * Es una heurística y solo se usa cuando el producto no trae la cota medida
 * a mano: funciona con tapas blancas, que es lo que tienen los tubos de la
 * marca, y falla con una tapa de color. Por eso la cota manual manda.
 */
export function detectarTapa(datos, silueta) {
  const { ancho, izquierda, primera, ultima } = silueta
  const desde = Math.round(primera + (ultima - primera) * 0.55)
  for (let y = desde; y <= ultima; y++) {
    const x0 = izquierda[y]
    if (x0 < 0) continue
    let grises = 0
    const muestras = 24
    for (let k = 6; k < 6 + muestras; k++) {
      if (esGrisClaro(datos, (y * ancho + x0 + k) * 4)) grises++
    }
    if (grises > muestras * 0.7) return y
  }
  // Sin tapa reconocible: se reserva el 15 % inferior, que es lo que ocupa
  // en los tubos de la marca.
  return Math.round(ultima - (ultima - primera) * 0.15)
}

/** El sellado de arriba ocupa en torno al 5 % del alto del tubo. */
export function detectarSellado(silueta) {
  const { primera, ultima } = silueta
  return Math.round(primera + (ultima - primera) * 0.05)
}

/**
 * Las cotas del envase: dónde acaba el sellado y dónde empieza la tapa, en
 * píxeles de la foto. Las medidas a mano mandan; si faltan, se detectan.
 */
export function cotasDelEnvase(envase, datos, silueta) {
  return {
    sellado: envase?.sellado ?? detectarSellado(silueta),
    tapa: envase?.tapa ?? detectarTapa(datos, silueta),
  }
}
