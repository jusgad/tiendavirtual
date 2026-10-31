import { describe, expect, it } from 'vitest'
import {
  ATMOSFERAS,
  ESTADOS_ESCENA,
  ESTADOS_MOVIL,
  atmosferaEn,
  leer,
  leerVector,
  mezclar,
  mezclarHex,
  suavizar,
} from './historia.js'

describe('mezclar', () => {
  it('devuelve los extremos tal cual', () => {
    expect(mezclar(10, 20, 0)).toBe(10)
    expect(mezclar(10, 20, 1)).toBe(20)
  })

  it('interpola en medio', () => {
    expect(mezclar(10, 20, 0.5)).toBe(15)
  })
})

describe('suavizar', () => {
  it('deja quietos los extremos', () => {
    expect(suavizar(0)).toBe(0)
    expect(suavizar(1)).toBe(1)
  })

  it('arranca y termina despacio, que es para lo que está', () => {
    expect(suavizar(0.1)).toBeLessThan(0.1)
    expect(suavizar(0.9)).toBeGreaterThan(0.9)
    expect(suavizar(0.5)).toBeCloseTo(0.5, 5)
  })
})

describe('leer', () => {
  const campo = (e) => e.campo

  it('da el valor exacto de cada estado entero', () => {
    ESTADOS_ESCENA.forEach((estado, i) => {
      expect(leer(ESTADOS_ESCENA, i, campo)).toBeCloseTo(estado.campo, 6)
    })
  })

  it('interpola entre dos estados', () => {
    const v = leer(ESTADOS_ESCENA, 0.5, campo)
    const [a, b] = [ESTADOS_ESCENA[0].campo, ESTADOS_ESCENA[1].campo]
    expect(v).toBeGreaterThan(Math.min(a, b))
    expect(v).toBeLessThan(Math.max(a, b))
  })

  /**
   * El valor de `historia` sale de medir centros de sección, y al recargar o
   * al rebotar el scroll puede salirse del rango por un instante. Si eso
   * reventara, la escena se quedaría congelada.
   */
  it('acota fuera de rango en vez de romperse', () => {
    expect(leer(ESTADOS_ESCENA, -3, campo)).toBe(ESTADOS_ESCENA[0].campo)
    expect(leer(ESTADOS_ESCENA, 99, campo)).toBe(ESTADOS_ESCENA.at(-1).campo)
  })
})

describe('leerVector', () => {
  it('interpola las tres componentes y reutiliza el destino', () => {
    const destino = [0, 0, 0]
    const r = leerVector(ESTADOS_ESCENA, 0, (e) => e.camara, destino)
    expect(r).toBe(destino) // no reserva memoria en cada fotograma
    expect(destino).toEqual(ESTADOS_ESCENA[0].camara)
  })

  it('acota en el último estado sin desbordar el array', () => {
    const destino = [0, 0, 0]
    leerVector(ESTADOS_ESCENA, 10, (e) => e.camara, destino)
    expect(destino).toEqual(ESTADOS_ESCENA.at(-1).camara)
  })
})

describe('mezclarHex', () => {
  it('devuelve los extremos', () => {
    expect(mezclarHex('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mezclarHex('#000000', '#ffffff', 1)).toBe('#ffffff')
  })

  it('mantiene siempre siete caracteres, también con componentes bajas', () => {
    const c = mezclarHex('#000000', '#0a0a0a', 0.5)
    expect(c).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('atmosferaEn', () => {
  it('coincide con la tabla en cada estado entero', () => {
    ATMOSFERAS.forEach((a, i) => {
      expect(atmosferaEn(i)).toEqual(a)
    })
  })

  it('devuelve colores válidos a mitad de camino', () => {
    const a = atmosferaEn(2.5)
    for (const c of Object.values(a)) expect(c).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('las tablas de estado', () => {
  it('tienen las cinco entradas que pide el guion', () => {
    expect(ATMOSFERAS).toHaveLength(5)
    expect(ESTADOS_ESCENA).toHaveLength(5)
    expect(ESTADOS_MOVIL).toHaveLength(5)
  })

  /**
   * En escritorio el texto de las bandas 2 y 3 va centrado o a un lado, y el
   * producto tiene que estar lo bastante apartado del eje para no quedar
   * detrás. Es la comprobación que el prompt pide hacer a ojo; aquí queda
   * escrita para que nadie la deshaga sin enterarse.
   */
  it('aparta el producto del centro en las bandas de texto', () => {
    for (const i of [2, 3]) {
      expect(Math.abs(ESTADOS_ESCENA[i].producto.pos[0])).toBeGreaterThan(2.5)
      expect(ESTADOS_ESCENA[i].producto.opacidad).toBeLessThan(0.5)
    }
  })

  /**
   * Entre dos estados seguidos con el producto retirado, el producto no debe
   * cambiar de lado: si lo hiciera, cruzaría la pantalla por detrás del
   * texto. Pasó con el ritual a la derecha y la confianza a la izquierda.
   */
  it('no cruza de lado entre el ritual y la confianza', () => {
    for (const estados of [ESTADOS_ESCENA, ESTADOS_MOVIL]) {
      expect(Math.sign(estados[2].producto.pos[0])).toBe(Math.sign(estados[3].producto.pos[0]))
    }
  })

  it('en móvil el producto nunca se va a los lados en el hero ni en el cierre', () => {
    for (const i of [0, 4]) {
      expect(ESTADOS_MOVIL[i].producto.pos[0]).toBe(0)
    }
  })
})

import { contraste } from './color.js'
import { esOscuro, factorNoche } from './historia.js'

/**
 * El texto va sobre un fondo que cambia con el scroll. Estos tests fijan lo
 * que el prompt pide comprobar: AA en cada estado, con el color de texto que
 * le toca a ese estado.
 */
describe('contraste del texto sobre la atmósfera', () => {
  const TINTA = '#343553'
  const CREMA = '#fff7ef'
  const textoDe = (i) => (esOscuro(i) ? CREMA : TINTA)

  it.each([0, 1, 2, 3, 4])('el estado %i cumple AA arriba, en medio y abajo', (i) => {
    const a = atmosferaEn(i)
    const medio = mezclarHex(a.top, a.bottom, 0.5)
    for (const fondo of [a.top, medio, a.bottom]) {
      expect(contraste(textoDe(i), fondo)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('esOscuro', () => {
  /** El bug que motivó la ventana: con un umbral, el cierre quedaba en crema. */
  it('el cierre vuelve a texto oscuro', () => {
    expect(esOscuro(3)).toBe(true)
    expect(esOscuro(4)).toBe(false)
    expect(esOscuro(0)).toBe(false)
  })
})

describe('factorNoche', () => {
  it('es 0 de día y en el cierre, y 1 en plena noche', () => {
    expect(factorNoche(0)).toBe(0)
    expect(factorNoche(1)).toBe(0)
    expect(factorNoche(3)).toBeCloseTo(1, 5)
    expect(factorNoche(4)).toBe(0)
  })

  it('no salta: cambia poco entre dos puntos cercanos', () => {
    for (let h = 0; h < 4; h += 0.05) {
      expect(Math.abs(factorNoche(h + 0.05) - factorNoche(h))).toBeLessThan(0.15)
    }
  })
})

import { posicionProducto } from './historia.js'

describe('posicionProducto', () => {
  /** El caso que lo motivó: volver al cierre desde la esquina de arriba. */
  it('entre la noche (invisible) y el cierre, ya está en el sitio del cierre', () => {
    const p = posicionProducto(ESTADOS_ESCENA, 3.3, [0, 0, 0])
    expect(p).toEqual(ESTADOS_ESCENA[4].producto.pos)
  })

  it('al apagarse, se queda donde estaba', () => {
    const p = posicionProducto(ESTADOS_ESCENA, 2.6, [0, 0, 0])
    expect(p).toEqual(ESTADOS_ESCENA[2].producto.pos)
  })

  it('entre estados visibles, interpola como siempre', () => {
    const p = posicionProducto(ESTADOS_ESCENA, 0.5, [0, 0, 0])
    const a = ESTADOS_ESCENA[0].producto.pos[0]
    const b = ESTADOS_ESCENA[1].producto.pos[0]
    expect(p[0]).toBeGreaterThan(Math.min(a, b))
    expect(p[0]).toBeLessThan(Math.max(a, b))
  })
})

import { ESTADOS_MOVIL, usaAncla } from './historia.js'

describe('anclas del producto', () => {
  // Un resolver que manda los estados anclados a un sitio reconocible.
  const enHueco = (e) => (e.ancla ? [9, 9, e.producto.pos[2]] : e.producto.pos)

  it('un estado anclado coloca el producto donde diga el resolver', () => {
    expect(posicionProducto(ESTADOS_ESCENA, 0, [0, 0, 0], enHueco)).toEqual([9, 9, ESTADOS_ESCENA[0].producto.pos[2]])
    expect(posicionProducto(ESTADOS_ESCENA, 4, [0, 0, 0], enHueco)).toEqual([9, 9, ESTADOS_ESCENA[4].producto.pos[2]])
  })

  it('sin resolver, vale la coordenada fija del estado', () => {
    expect(posicionProducto(ESTADOS_ESCENA, 0, [0, 0, 0])).toEqual(ESTADOS_ESCENA[0].producto.pos)
  })

  it('apertura y cierre están anclados en escritorio y en móvil', () => {
    for (const estados of [ESTADOS_ESCENA, ESTADOS_MOVIL]) {
      expect(estados[0].ancla).toBe('apertura')
      expect(estados.at(-1).ancla).toBe('cierre')
    }
  })

  it('usaAncla avisa solo en los tramos que tocan un estado anclado', () => {
    expect(usaAncla(ESTADOS_ESCENA, 0.5)).toBe(true)
    expect(usaAncla(ESTADOS_ESCENA, 1.5)).toBe(false)
    expect(usaAncla(ESTADOS_ESCENA, 3.5)).toBe(true)
    expect(usaAncla(ESTADOS_ESCENA, 4)).toBe(true)
  })

  it('en móvil el producto no se ve en las bandas de texto a lo ancho', () => {
    for (const e of ESTADOS_MOVIL.slice(1, -1)) expect(e.producto.opacidad).toBe(0)
  })
})
