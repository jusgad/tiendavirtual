import { describe, expect, it, vi } from 'vitest'

// `framer-motion` no hace falta para la función pura; se evita cargarlo.
vi.mock('framer-motion', () => ({}))
const { historiaEn } = await import('./useHistoria.js')

describe('historiaEn', () => {
  const centros = [100, 300, 500]
  const valores = [0, 1, 2]

  it('acota en los extremos', () => {
    expect(historiaEn(0, centros, valores)).toBe(0)
    expect(historiaEn(999, centros, valores)).toBe(2)
  })

  it('vale el estado exacto en el centro de cada sección', () => {
    expect(historiaEn(300, centros, valores)).toBe(1)
  })

  it('interpola entre centros', () => {
    expect(historiaEn(200, centros, valores)).toBeCloseTo(0.5, 6)
  })

  /**
   * Para lo que se reescribió: dos secciones con el mismo valor forman una
   * meseta, y entre sus centros el recorrido no avanza.
   */
  it('dos marcas con el mismo valor dejan el recorrido quieto entre ellas', () => {
    const c = [100, 300, 500, 700]
    const v = [2, 3, 3, 4]
    expect(historiaEn(350, c, v)).toBe(3)
    expect(historiaEn(450, c, v)).toBe(3)
    expect(historiaEn(600, c, v)).toBeCloseTo(3.5, 6)
  })

  it('no devuelve NaN si dos centros coinciden (fuentes aún sin cargar)', () => {
    expect(Number.isNaN(historiaEn(200, [200, 200], [1, 2]))).toBe(false)
  })

  it('sin secciones, 0', () => {
    expect(historiaEn(10, [], [])).toBe(0)
  })
})
