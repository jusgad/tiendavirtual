import { describe, expect, it } from 'vitest'
import { ofertaLanzamiento } from './lanzamiento.js'

const EN_NOVIEMBRE = new Date('2026-11-15T10:00:00-05:00')
const EN_DICIEMBRE = new Date('2026-12-01T00:30:00-05:00')

describe('ofertaLanzamiento', () => {
  it('tacha el precio regular mientras dura el lanzamiento', () => {
    const oferta = ofertaLanzamiento('$89.900', EN_NOVIEMBRE)
    expect(oferta.antes).toBe('$117.500')
    expect(oferta.ahorro).toBe('$27.600')
  })

  it('no tacha nada cuando el lanzamiento ya pasó', () => {
    expect(ofertaLanzamiento('$89.900', EN_DICIEMBRE)).toBeNull()
  })

  it('aguanta hasta el último minuto del 30 de noviembre en hora de Colombia', () => {
    expect(ofertaLanzamiento('$89.900', new Date('2026-11-30T23:00:00-05:00'))).not.toBeNull()
    expect(ofertaLanzamiento('$89.900', new Date('2026-11-30T19:00:00Z'))).not.toBeNull()
  })

  it('no tacha si el panel sube el precio al regular o más', () => {
    expect(ofertaLanzamiento('$117.500', EN_NOVIEMBRE)).toBeNull()
    expect(ofertaLanzamiento('$129.900', EN_NOVIEMBRE)).toBeNull()
  })

  it('no tacha si el precio en pantalla no se entiende', () => {
    expect(ofertaLanzamiento(null, EN_NOVIEMBRE)).toBeNull()
    expect(ofertaLanzamiento('', EN_NOVIEMBRE)).toBeNull()
    expect(ofertaLanzamiento('consultar', EN_NOVIEMBRE)).toBeNull()
  })
})
