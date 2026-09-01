import {
  createProductSchema,
  updateProductSchema,
} from '../../../src/modules/catalog/interfaces/http/catalog.dto'

/**
 * Estos tests fijan el contrato con el panel de administración.
 *
 * El formulario del panel manda `null` en cada campo opcional que la dueña
 * deje en blanco, en vez de omitirlo: omitirlo haría imposible *borrar* un
 * dato ya guardado, porque `updateProductSchema` es `.partial()` y un campo
 * ausente significa "no lo toques".
 *
 * Ese desajuste ya mordió una vez: los esquemas solo tenían `.optional()`, que
 * en Zod NO acepta `null`, así que cualquier alta con un campo vacío moría con
 * un 400 antes de llegar al caso de uso. Se arregló añadiendo `.nullable()`,
 * pero el arreglo estaba verificado solo por lectura. Estos tests lo amarran.
 */

/** El payload exacto que produce `formularioAPayload` del panel. */
const payloadDelPanel = (extra: Record<string, unknown> = {}) => ({
  name: 'Crema Noche',
  sku: 'POM-NOC-50',
  description: 'Presentación individual.',
  brandId: '11111111-1111-1111-1111-111111111111',
  categoryId: '22222222-2222-2222-2222-222222222222',
  price: 49900,
  stock: 10,
  presentation: null,
  sizeMl: null,
  usageType: null,
  skinType: null,
  ingredients: null,
  warnings: null,
  isActive: true,
  images: [],
  ...extra,
})

const OPCIONALES = ['presentation', 'sizeMl', 'usageType', 'skinType', 'ingredients', 'warnings']

describe('createProductSchema', () => {
  it('acepta el alta con todos los campos opcionales en null', () => {
    const r = createProductSchema.safeParse(payloadDelPanel())
    expect(r.success).toBe(true)
  })

  it.each(OPCIONALES)('acepta null en %s por separado', (campo) => {
    const r = createProductSchema.safeParse(payloadDelPanel({ [campo]: null }))
    expect(r.success).toBe(true)
  })

  it('acepta una imagen con alt en null', () => {
    const r = createProductSchema.safeParse(
      payloadDelPanel({ images: [{ url: 'https://cdn.test/a.png', alt: null, position: 0 }] }),
    )
    expect(r.success).toBe(true)
  })

  it('sigue rechazando null en los campos obligatorios', () => {
    const r = createProductSchema.safeParse(payloadDelPanel({ name: null }))
    expect(r.success).toBe(false)
  })

  it('rechaza una imagen sin url válida', () => {
    const r = createProductSchema.safeParse(payloadDelPanel({ images: [{ url: 'no-es-url' }] }))
    expect(r.success).toBe(false)
  })
})

describe('updateProductSchema', () => {
  it('acepta null en los opcionales: así es como el panel los borra', () => {
    const r = updateProductSchema.safeParse(payloadDelPanel())
    expect(r.success).toBe(true)
  })

  it.each(OPCIONALES)('acepta borrar %s mandando null a solas', (campo) => {
    const r = updateProductSchema.safeParse({ [campo]: null })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toHaveProperty(campo, null)
  })

  it('acepta un array de imágenes vacío: es como se deja un producto sin fotos', () => {
    const r = updateProductSchema.safeParse({ images: [] })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.images).toEqual([])
  })

  it('distingue omitir de anular: el campo ausente no aparece en el resultado', () => {
    const r = updateProductSchema.safeParse({ name: 'Otro nombre' })
    expect(r.success).toBe(true)
    if (r.success) expect('presentation' in r.data).toBe(false)
  })
})
