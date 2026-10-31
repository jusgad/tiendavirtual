import { describe, expect, it } from 'vitest'
import {
  ALTO_CUERPO,
  ALTO_TOTAL,
  RADIO,
  crearCuerpo,
  crearSellado,
  crearTapa,
  perfil,
} from './geometriaTubo.js'
import { bordesEn, cotasDelEnvase, detectarSellado, detectarTapa, medirSilueta } from './silueta.js'

/**
 * Imagen sintética con forma de tubo: un trapecio opaco que se estrecha hacia
 * abajo, con una franja gris al final que hace de tapa. Sirve para probar la
 * medición sin depender de las fotos reales.
 */
function tuboSintetico({ ancho = 100, alto = 200, tapaDesde = 170 } = {}) {
  const datos = new Uint8ClampedArray(ancho * alto * 4)
  for (let y = 10; y < 196; y++) {
    // De 80 px de ancho arriba a 50 abajo.
    const medio = 40 - ((y - 10) / 186) * 15
    const x0 = Math.round(50 - medio)
    const x1 = Math.round(50 + medio)
    for (let x = x0; x <= x1; x++) {
      const i = (y * ancho + x) * 4
      const gris = y >= tapaDesde
      datos[i] = gris ? 230 : 240
      datos[i + 1] = gris ? 230 : 100
      datos[i + 2] = gris ? 230 : 10
      datos[i + 3] = 255
    }
  }
  return { datos, ancho, alto }
}

describe('medirSilueta', () => {
  it('encuentra la primera y la última fila opaca', () => {
    const { datos, ancho, alto } = tuboSintetico()
    const s = medirSilueta(datos, ancho, alto)
    expect(s.primera).toBe(10)
    expect(s.ultima).toBe(195)
  })

  it('marca con -1 las filas vacías y mide el ancho de las llenas', () => {
    const { datos, ancho, alto } = tuboSintetico()
    const s = medirSilueta(datos, ancho, alto)
    expect(s.izquierda[0]).toBe(-1)
    expect(s.derecha[10] - s.izquierda[10]).toBe(80)
  })
})

describe('bordesEn', () => {
  it('interpola entre filas, sin escalones', () => {
    const { datos, ancho, alto } = tuboSintetico()
    const s = medirSilueta(datos, ancho, alto)
    const [a] = bordesEn(s, 50)
    const [b] = bordesEn(s, 51)
    const [m] = bordesEn(s, 50.5)
    expect(m).toBeCloseTo((a + b) / 2, 5)
  })

  it('acota fuera de la silueta en vez de devolver -1', () => {
    const { datos, ancho, alto } = tuboSintetico()
    const s = medirSilueta(datos, ancho, alto)
    const [izq] = bordesEn(s, 0)
    expect(izq).toBeGreaterThanOrEqual(0)
  })
})

describe('cotas del envase', () => {
  it('detecta dónde empieza una tapa blanca', () => {
    const { datos, ancho, alto } = tuboSintetico({ tapaDesde: 170 })
    const s = medirSilueta(datos, ancho, alto)
    expect(detectarTapa(datos, s)).toBe(170)
  })

  it('reserva un sellado razonable arriba', () => {
    const { datos, ancho, alto } = tuboSintetico()
    const s = medirSilueta(datos, ancho, alto)
    const sellado = detectarSellado(s)
    expect(sellado).toBeGreaterThan(s.primera)
    expect(sellado).toBeLessThan(s.primera + 20)
  })

  it('las cotas medidas a mano mandan sobre la detección', () => {
    const { datos, ancho, alto } = tuboSintetico()
    const s = medirSilueta(datos, ancho, alto)
    expect(cotasDelEnvase({ sellado: 33, tapa: 150 }, datos, s)).toEqual({ sellado: 33, tapa: 150 })
  })
})

describe('perfil del tubo', () => {
  it('abajo es redondo', () => {
    expect(perfil(0)).toEqual({ x: 1, z: 1 })
  })

  /**
   * La razón de ser del perfil: un tubo aplastado conserva el perímetro de la
   * boca, así que arriba mide medio perímetro de ancho.
   */
  it('arriba mide π/2 veces el diámetro y es casi plano', () => {
    const { x, z } = perfil(1)
    expect(x).toBeCloseTo(Math.PI / 2, 6)
    expect(z).toBeLessThan(0.05)
    expect(z).toBeGreaterThan(0) // nunca cero: las normales se indefinirían
  })

  it('se ensancha y se aplasta de forma monótona', () => {
    let anterior = perfil(0)
    for (let s = 0.1; s <= 1.0001; s += 0.1) {
      const p = perfil(s)
      expect(p.x).toBeGreaterThanOrEqual(anterior.x)
      expect(p.z).toBeLessThanOrEqual(anterior.z)
      anterior = p
    }
  })
})

describe('crearCuerpo', () => {
  const { datos, ancho, alto } = tuboSintetico()
  const silueta = medirSilueta(datos, ancho, alto)
  const cotas = { sellado: 15, tapa: 170 }
  const g = crearCuerpo({ silueta, cotas, radial: 32, alto: 16 })

  it('reparte todos los triángulos entre frente y espalda', () => {
    const [frente, espalda] = g.groups
    expect(frente.materialIndex).toBe(0)
    expect(espalda.materialIndex).toBe(1)
    expect(frente.count + espalda.count).toBe(g.index.count)
    // Mitad y mitad: la costura está detrás y el frente es simétrico.
    expect(frente.count).toBe(espalda.count)
  })

  it('tiene la altura del cuerpo', () => {
    expect(g.boundingBox.min.y).toBeCloseTo(0, 6)
    expect(g.boundingBox.max.y).toBeCloseTo(ALTO_CUERPO, 6)
  })

  /** Si las normales apuntaran adentro, el tubo se vería del revés con la luz. */
  it('las normales apuntan hacia afuera', () => {
    const pos = g.attributes.position
    const nor = g.attributes.normal
    let haciaFuera = 0
    for (let i = 0; i < pos.count; i++) {
      const radial = pos.getX(i) * nor.getX(i) + pos.getZ(i) * nor.getZ(i)
      if (radial > 0) haciaFuera++
    }
    expect(haciaFuera / pos.count).toBeGreaterThan(0.98)
  })

  it('las coordenadas de la foto caen dentro de la imagen', () => {
    const uv = g.attributes.uv
    for (let i = 0; i < uv.count; i++) {
      expect(uv.getX(i)).toBeGreaterThanOrEqual(0)
      expect(uv.getX(i)).toBeLessThanOrEqual(1)
      expect(uv.getY(i)).toBeGreaterThanOrEqual(0)
      expect(uv.getY(i)).toBeLessThanOrEqual(1)
    }
  })

  /**
   * El borde del tubo en la foto tiene que caer sobre el borde de la
   * geometría: si no, se vería el fondo transparente de la imagen en los
   * costados, o el arte cortado.
   */
  it('el borde de la foto coincide con el borde del tubo', () => {
    const uv = g.attributes.uv
    const columnas = 33
    const fila = 8 // a media altura
    // En θ = π/2 (columna 3/4 desde la costura trasera) el tubo está en su
    // borde derecho visto de frente... la columna con sen(θ) mínimo es el
    // borde izquierdo de la foto.
    let minU = 1
    let maxU = 0
    for (let i = 0; i < columnas; i++) {
      const u = uv.getX(fila * columnas + i)
      minU = Math.min(minU, u)
      maxU = Math.max(maxU, u)
    }
    const filaFoto = cotas.tapa - (fila / 16) * (cotas.tapa - cotas.sellado)
    const [izq, der] = bordesEn(silueta, filaFoto)
    expect(minU * ancho).toBeCloseTo(izq, 3)
    expect(maxU * ancho).toBeCloseTo(der, 3)
  })

  it('sin foto, sigue construyéndose (respaldo si la imagen falla)', () => {
    const sinFoto = crearCuerpo({ radial: 16, alto: 8 })
    expect(sinFoto.index.count).toBeGreaterThan(0)
  })
})

describe('tapa y sellado', () => {
  it('la tapa cuelga por debajo del origen', () => {
    const t = crearTapa(16)
    t.computeBoundingBox()
    expect(t.boundingBox.max.y).toBeCloseTo(0, 6)
    expect(t.boundingBox.min.y).toBeLessThan(0)
    expect(t.boundingBox.max.x).toBeCloseTo(RADIO, 3)
  })

  it('el sellado va encima del cuerpo y tiene el ancho del tubo aplastado', () => {
    const s = crearSellado()
    s.computeBoundingBox()
    expect(s.boundingBox.min.y).toBeCloseTo(ALTO_CUERPO, 6)
    const ancho = s.boundingBox.max.x - s.boundingBox.min.x
    expect(ancho).toBeCloseTo(2 * RADIO * (Math.PI / 2) * 1.01, 3)
  })

  it('el alto total suma las tres piezas', () => {
    expect(ALTO_TOTAL).toBeGreaterThan(ALTO_CUERPO)
  })
})
