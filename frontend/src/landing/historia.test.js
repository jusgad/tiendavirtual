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

  it('en móvil el producto nunca se va a los lados en el hero ni en el cierre', () => {
    for (const i of [0, 4]) {
      expect(ESTADOS_MOVIL[i].producto.pos[0]).toBe(0)
    }
  })
})
