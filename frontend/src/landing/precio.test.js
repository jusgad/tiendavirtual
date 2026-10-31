import { describe, expect, it } from 'vitest'
import { precioVisible } from './precio.js'

describe('precioVisible', () => {
  it('formatea el precio de la API como lo escribe la marca', () => {
    expect(precioVisible({ price: 89900 })).toBe('$89.900')
    expect(precioVisible({ price: '99900.00' })).toBe('$99.900')
  })

  it('sin precio válido no inventa uno: se queda el de respaldo', () => {
    expect(precioVisible(null)).toBeNull()
    expect(precioVisible({ price: 0 })).toBeNull()
    expect(precioVisible({ price: 'abc' })).toBeNull()
  })
})
