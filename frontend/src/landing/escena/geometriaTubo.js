import * as THREE from 'three'
import { bordesEn } from './silueta.js'

/**
 * Geometría de un tubo de crema, como los de PomAss: redondo abajo, donde
 * enrosca la tapa, y cada vez más plano hacia arriba, hasta el sellado.
 *
 * La forma no es a ojo. Un tubo aplastado conserva el perímetro de su boca
 * redonda, así que el ancho plano de arriba es medio perímetro: π·r, o sea
 * π/2 veces el diámetro. Las fotos de los dos tubos dan 1,61 y 1,51; la
 * física da 1,57. Se usa la física.
 *
 * Unidades arbitrarias: el grupo que contiene los tubos los escala al
 * tamaño de escena. El origen está en la unión entre cuerpo y tapa: la tapa
 * cuelga por debajo (y negativa) y el cuerpo sube.
 */

export const RADIO = 0.3
export const ALTO_CUERPO = 1.75
export const ALTO_TAPA = 0.34
export const ALTO_SELLADO = 0.1

/** Ancho plano de arriba: medio perímetro de la boca redonda. */
const ENSANCHE_MAX = Math.PI / 2

/** Grosor mínimo arriba. A cero, las normales del borde se indefinen. */
const GROSOR_MIN = 0.035

/**
 * Cuánto se ensancha y cuánto se aplasta el tubo a la altura `s` (0 abajo,
 * 1 arriba). El exponente hace que la parte baja siga casi redonda y el
 * aplastado se concentre arriba, como en las fotos.
 */
export function perfil(s) {
  const x = 1 + (ENSANCHE_MAX - 1) * Math.pow(Math.min(Math.max(s, 0), 1), 1.15)
  // A medida que se ensancha, se aplasta: con ensanche máximo, plano.
  const z = Math.max(GROSOR_MIN, 1 - (x - 1) / (ENSANCHE_MAX - 1))
  return { x, z }
}

/**
 * Cuerpo del tubo, con la foto del producto proyectada de frente.
 *
 * Lleva dos grupos de material: 0 para la mitad frontal (la etiqueta) y 1
 * para la espalda (plástico liso del color del tubo). Proyectar la foto
 * también por detrás la dejaría en espejo, con el texto al revés.
 *
 * Las coordenadas de textura salen de la silueta medida fila a fila, no de
 * una fórmula: así el borde del tubo en la foto cae exactamente sobre el
 * borde de la geometría aunque la perspectiva de la foto no sea perfecta.
 *
 * @param silueta  resultado de `medirSilueta`, o null para dejar el cuerpo
 *                 sin coordenadas de foto (respaldo si la imagen falla)
 * @param cotas    { sellado, tapa } en píxeles de la foto
 */
export function crearCuerpo({ silueta = null, cotas = null, radial = 64, alto = 48 } = {}) {
  const columnas = radial + 1
  const filas = alto + 1
  const posiciones = new Float32Array(columnas * filas * 3)
  const uvs = new Float32Array(columnas * filas * 2)

  // La costura (donde el primer y el último vértice de cada anillo coinciden)
  // va en la espalda, en θ = π. En el frente se vería una arista en la luz.
  const theta0 = Math.PI

  for (let j = 0; j < filas; j++) {
    const s = j / alto
    const { x: ex, z: ez } = perfil(s)
    const y = s * ALTO_CUERPO

    // Fila de la foto que corresponde a esta altura: de la tapa (abajo) al
    // sellado (arriba).
    const filaFoto = cotas ? cotas.tapa - s * (cotas.tapa - cotas.sellado) : 0
    const [bordeIzq, bordeDer] = silueta ? bordesEn(silueta, filaFoto) : [0, 1]
    const centro = (bordeIzq + bordeDer) / 2
    const medio = (bordeDer - bordeIzq) / 2

    for (let i = 0; i < columnas; i++) {
      const theta = theta0 + (i / radial) * Math.PI * 2
      const sen = Math.sin(theta)
      const cos = Math.cos(theta)
      const k = j * columnas + i

      posiciones[k * 3] = RADIO * sen * ex
      posiciones[k * 3 + 1] = y
      posiciones[k * 3 + 2] = RADIO * cos * ez

      // Proyección frontal: la fracción horizontal de la foto es sen(θ), la
      // misma que ve una cámara que mira el tubo de frente.
      if (silueta) {
        uvs[k * 2] = (centro + sen * medio) / silueta.ancho
        uvs[k * 2 + 1] = 1 - filaFoto / silueta.alto
      } else {
        uvs[k * 2] = 0.5 + sen * 0.5
        uvs[k * 2 + 1] = s
      }
    }
  }

  const frente = []
  const espalda = []
  for (let j = 0; j < alto; j++) {
    for (let i = 0; i < radial; i++) {
      const a = j * columnas + i
      const b = a + 1
      const c = a + columnas
      const d = c + 1
      const thetaMedio = theta0 + ((i + 0.5) / radial) * Math.PI * 2
      const destino = Math.cos(thetaMedio) > 0 ? frente : espalda
      // Orden antihorario visto desde fuera: las normales apuntan hacia
      // afuera y el cuerpo no se ve del revés.
      destino.push(a, b, c, b, d, c)
    }
  }

  const geometria = new THREE.BufferGeometry()
  geometria.setAttribute('position', new THREE.BufferAttribute(posiciones, 3))
  geometria.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometria.setIndex([...frente, ...espalda])
  geometria.addGroup(0, frente.length, 0)
  geometria.addGroup(frente.length, espalda.length, 1)
  geometria.computeVertexNormals()
  coserNormales(geometria, columnas, filas)
  geometria.computeBoundingBox()
  geometria.computeBoundingSphere()
  return geometria
}

/**
 * Promedia las normales de la costura. El primer y el último vértice de cada
 * anillo están en el mismo sitio pero `computeVertexNormals` los trata como
 * distintos, y cada uno sale con media normal: se vería una línea de luz.
 */
function coserNormales(geometria, columnas, filas) {
  const n = geometria.attributes.normal
  for (let j = 0; j < filas; j++) {
    const a = j * columnas
    const b = a + columnas - 1
    const x = n.getX(a) + n.getX(b)
    const y = n.getY(a) + n.getY(b)
    const z = n.getZ(a) + n.getZ(b)
    const l = Math.hypot(x, y, z) || 1
    n.setXYZ(a, x / l, y / l, z / l)
    n.setXYZ(b, x / l, y / l, z / l)
  }
  n.needsUpdate = true
}

/**
 * La tapa blanca, enroscada abajo. Perfil de revolución: un escalón donde
 * encaja con el cuerpo, la pared recta y el canto redondeado de la base,
 * que es sobre lo que se apoya el tubo.
 */
export function crearTapa(segmentos = 64) {
  const r = RADIO
  const h = ALTO_TAPA
  const puntos = [
    [0, -h],
    [r * 0.78, -h],
    [r * 0.93, -h + 0.025],
    [r * 0.99, -h + 0.07],
    [r * 1.0, -h + 0.12],
    [r * 1.0, -0.03],
    [r * 0.965, -0.012],
    [r * 0.965, 0],
  ].map(([x, y]) => new THREE.Vector2(x, y))
  const geometria = new THREE.LatheGeometry(puntos, segmentos)
  geometria.computeVertexNormals()
  return geometria
}

/** El sellado plano de arriba, con el ancho exacto del tubo aplastado. */
export function crearSellado() {
  const ancho = 2 * RADIO * perfil(1).x
  const geometria = new THREE.BoxGeometry(ancho * 1.01, ALTO_SELLADO, 0.032, 1, 1, 1)
  geometria.translate(0, ALTO_CUERPO + ALTO_SELLADO / 2, 0)
  return geometria
}

/** Alto total de un tubo, de la base de la tapa a la punta del sellado. */
export const ALTO_TOTAL = ALTO_TAPA + ALTO_CUERPO + ALTO_SELLADO
