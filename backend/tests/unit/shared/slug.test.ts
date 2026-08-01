import { slugify } from '../../../src/shared/utils/slug'

describe('slugify', () => {
  it('quita acentos y pasa a minúsculas', () => {
    expect(slugify('Crema Íntima Día')).toBe('crema-intima-dia')
  })
  it('colapsa espacios y símbolos en guiones', () => {
    expect(slugify('Gel  refrescante / íntimo!!')).toBe('gel-refrescante-intimo')
  })
  it('recorta guiones en los extremos', () => {
    expect(slugify('  ¡Hola!  ')).toBe('hola')
  })
})
