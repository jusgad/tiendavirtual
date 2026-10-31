import { describe, expect, it } from 'vitest'
import { CATALOGO, COMBO, NOMBRE_COMBO, PRODUCTOS, TESTIMONIOS } from '../site.js'
import { ESTADOS_ESCENA } from './historia.js'
import { ICONOS, IconMoon, IconSun } from './icons.jsx'

/**
 * El catálogo es la única fuente de los productos: la escena 3D, el ritual y
 * el combo lo recorren. Estos tests son el contrato que tiene que cumplir un
 * producto nuevo para aparecer bien en los tres sitios sin tocar componentes.
 */
describe('catálogo', () => {
  it('está ordenado por `orden`', () => {
    const ordenes = CATALOGO.map((p) => p.orden)
    expect([...ordenes].sort((a, b) => a - b)).toEqual(ordenes)
  })

  it.each(CATALOGO.map((p) => [p.id, p]))('%s trae todo lo que necesitan las tres secciones', (_, p) => {
    for (const campo of ['id', 'nombre', 'tipo', 'beneficio', 'cuando', 'imagen', 'icono', 'color']) {
      expect(p[campo], campo).toBeTruthy()
    }
    expect(p.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(Array.isArray(p.beneficios)).toBe(true)
    // El momento tiene que ser un estado del recorrido, o el tubo nunca
    // daría su paso al frente.
    expect(p.momento).toBeGreaterThanOrEqual(0)
    expect(p.momento).toBeLessThan(ESTADOS_ESCENA.length)
    // La etiqueta 3D sale de esta foto.
    expect(p.envase?.imagen).toMatch(/\.png$/)
  })

  it('los íconos del momento y de los beneficios existen', () => {
    const momento = { sun: IconSun, moon: IconMoon }
    for (const p of CATALOGO) {
      expect(momento[p.icono], p.id).toBeTruthy()
      for (const b of p.beneficios) expect(ICONOS[b.icon], b.icon).toBeTruthy()
    }
  })

  /** Las cotas medidas tienen que dejar el sellado arriba y la tapa abajo. */
  it('las cotas del envase, si vienen, están en orden', () => {
    for (const p of CATALOGO) {
      if (p.envase.sellado != null && p.envase.tapa != null) {
        expect(p.envase.sellado).toBeLessThan(p.envase.tapa)
      }
    }
  })

  it('cada id es único y coincide con su clave', () => {
    for (const [clave, p] of Object.entries(PRODUCTOS)) expect(p.id).toBe(clave)
    expect(new Set(CATALOGO.map((p) => p.id)).size).toBe(CATALOGO.length)
  })
})

describe('combo', () => {
  it('se llama «Día + Noche», como pide el manual', () => {
    expect(NOMBRE_COMBO).toBe('Día + Noche')
  })

  it('contiene solo productos con descripción de combo', () => {
    expect(COMBO.length).toBeGreaterThan(0)
    for (const p of COMBO) expect(p.enCombo).toBeTruthy()
  })
})

describe('testimonios', () => {
  /**
   * Vacío hasta que haya testimonios reales. Si alguien añade uno, tiene que
   * traer texto y autora: un testimonio sin autora no genera confianza y
   * parece inventado.
   */
  it('si hay alguno, trae texto y autora', () => {
    for (const t of TESTIMONIOS) {
      expect(t.texto).toBeTruthy()
      expect(t.autora).toBeTruthy()
    }
  })
})
