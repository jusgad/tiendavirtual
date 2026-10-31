import * as THREE from 'three'

/**
 * Trayectorias de los velos de brisa. Son las del prompt, pensadas para el
 * producto en (0.3, 0, 0), que es donde está en el hero.
 *
 * `abraza` es la cinta que pasa por delante de la base de los tubos y por
 * detrás de la punta: es la que ata la brisa al producto. Las demás cruzan el
 * espacio y se abren hacia los bordes.
 *
 * Los colores van por pares: el de día y el de noche. La escena los mezcla
 * según el recorrido, porque una cinta durazno sobre el magenta de la noche
 * se leería como una mancha y no como aire.
 */
export const TRAYECTORIAS = [
  {
    id: 'fondo',
    ancho: 1.7,
    giro: 0.6,
    dia: '#FFD0A8',
    noche: '#C15BB0',
    puntos: [[-6.5, -1.3, -2.6], [-3.2, -0.3, -1.9], [-0.6, 0.8, -1.4], [1.6, 0.7, -1.5], [4.2, -0.3, -2.1], [7, 0.4, -2.9]],
  },
  {
    id: 'abraza',
    ancho: 0.75,
    giro: 1.4,
    dia: '#F9A27C',
    noche: '#E07FCE',
    puntos: [[-5.5, 0.9, -1.2], [-2.4, -0.2, 0.1], [-0.3, -0.95, 1.25], [1.3, -0.55, 1.1], [1.75, 0.55, -0.2], [0.6, 1.35, -1.2], [-1.4, 2.3, -2.1]],
  },
  {
    id: 'hilo-alto',
    ancho: 0.45,
    giro: 1.1,
    dia: '#FFF1E2',
    noche: '#F3C3EA',
    puntos: [[-6.2, 2.5, -2], [-2.6, 1.75, -0.8], [0.7, 1.55, 0.35], [3, 2.15, -0.3], [6.6, 3, -1.5]],
  },
  {
    id: 'barrido',
    ancho: 1.0,
    giro: 0.9,
    dia: '#F4A07A',
    noche: '#B04FA8',
    puntos: [[7, -2.3, 1.2], [3.6, -1.5, 1.7], [1, -1.75, 2.3], [-2.2, -2.5, 1.6], [-6.2, -1.9, 0.4]],
  },
  {
    id: 'ascenso',
    ancho: 0.55,
    giro: 1.6,
    dia: '#FFC9A3',
    noche: '#D16CC2',
    puntos: [[1.4, -3.2, -1.3], [0.5, -1.1, -0.9], [1.5, 0.4, -1.1], [0.7, 2, -1.5], [1.9, 3.5, -2.1]],
  },
  {
    id: 'lejana',
    ancho: 2.3,
    giro: 0.4,
    dia: '#FFE0C4',
    noche: '#9E3C98',
    puntos: [[-7.2, -0.6, -4], [-4.6, 1.2, -3.6], [-2.1, 0.2, -3.3], [0.2, -1.5, -3.7]],
  },
]

/** En móvil o en equipos lentos solo quedan estas tres. */
export const TRAYECTORIAS_LIGERAS = ['fondo', 'abraza', 'hilo-alto']

/** Curvas listas para usar, con las trayectorias filtradas por calidad. */
export function crearCurvas(ids) {
  return TRAYECTORIAS.filter((t) => ids.includes(t.id)).map((t) => ({
    ...t,
    curva: new THREE.CatmullRomCurve3(
      t.puntos.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      false,
      'catmullrom',
      0.5,
    ),
  }))
}

/**
 * Muestrea una curva en `n` puntos equidistantes en longitud, en un array
 * plano [x, y, z, x, y, z…].
 *
 * Equidistantes en longitud y no en parámetro: las partículas que viajan
 * por la curva irían más deprisa en los tramos largos entre puntos de
 * control y se amontonarían en los cortos.
 */
export function muestrear(curva, n) {
  const salida = new Float32Array(n * 3)
  const p = new THREE.Vector3()
  for (let i = 0; i < n; i++) {
    curva.getPointAt(i / (n - 1), p)
    salida[i * 3] = p.x
    salida[i * 3 + 1] = p.y
    salida[i * 3 + 2] = p.z
  }
  return salida
}

/** Punto en una curva muestreada, interpolando entre muestras. */
export function puntoEn(muestras, u, destino) {
  const n = muestras.length / 3
  const f = Math.min(Math.max(u, 0), 1) * (n - 1)
  const i = Math.min(Math.floor(f), n - 2)
  const t = f - i
  for (let k = 0; k < 3; k++) {
    destino[k] = muestras[i * 3 + k] + (muestras[(i + 1) * 3 + k] - muestras[i * 3 + k]) * t
  }
  return destino
}
