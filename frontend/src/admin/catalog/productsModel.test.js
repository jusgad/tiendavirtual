import { describe, expect, it } from 'vitest'
import {
  formularioAPayload,
  formularioVacio,
  moverImagen,
  productoAFormulario,
  validarProducto,
} from './productsModel.js'

describe('formularioVacio', () => {
  it('arranca activo y con stock y precio en blanco', () => {
    const f = formularioVacio('b1', 'c1')
    expect(f.brandId).toBe('b1')
    expect(f.categoryId).toBe('c1')
    expect(f.isActive).toBe(true)
    expect(f.price).toBe('')
    expect(f.images).toEqual([])
  })
})

describe('validarProducto', () => {
  const base = () => ({
    ...formularioVacio('b1', 'c1'),
    name: 'Estuche',
    sku: 'PA-1',
    description: 'Descripción',
    price: '79900',
    stock: '10',
  })

  it('acepta un formulario completo', () => {
    expect(validarProducto(base())).toEqual({})
  })

  it('exige nombre, sku y descripción', () => {
    const e = validarProducto({ ...base(), name: '  ', sku: '', description: '' })
    expect(e.name).toBeTruthy()
    expect(e.sku).toBeTruthy()
    expect(e.description).toBeTruthy()
  })

  it('exige que el precio sea mayor que cero', () => {
    expect(validarProducto({ ...base(), price: '0' }).price).toBeTruthy()
    expect(validarProducto({ ...base(), price: 'abc' }).price).toBeTruthy()
    expect(validarProducto({ ...base(), price: '-5' }).price).toBeTruthy()
  })

  it('acepta stock cero pero no negativo ni decimal', () => {
    expect(validarProducto({ ...base(), stock: '0' }).stock).toBeUndefined()
    expect(validarProducto({ ...base(), stock: '-1' }).stock).toBeTruthy()
    expect(validarProducto({ ...base(), stock: '1.5' }).stock).toBeTruthy()
  })

  it('exige marca y categoría', () => {
    const e = validarProducto({ ...base(), brandId: '', categoryId: '' })
    expect(e.brandId).toBeTruthy()
    expect(e.categoryId).toBeTruthy()
  })

  it('rechaza una imagen sin URL', () => {
    const e = validarProducto({ ...base(), images: [{ url: '  ', alt: 'x' }] })
    expect(e.images).toBeTruthy()
  })
})

describe('productoAFormulario', () => {
  it('convierte nulos en cadenas vacías, para que el formulario no reviente', () => {
    const f = productoAFormulario({
      name: 'Estuche', sku: 'PA-1', description: 'd',
      brandId: 'b1', categoryId: 'c1', price: 79900, stock: 10,
      presentation: null, sizeMl: null, usageType: null, skinType: null,
      ingredients: null, warnings: null, isActive: false,
      images: [{ url: 'a.png', alt: null, position: 0 }],
    })
    expect(f.presentation).toBe('')
    expect(f.sizeMl).toBe('')
    expect(f.price).toBe('79900')
    expect(f.isActive).toBe(false)
    expect(f.images).toEqual([{ url: 'a.png', alt: '' }])
  })
})

describe('formularioAPayload', () => {
  it('convierte números y manda null en los opcionales vacíos', () => {
    const p = formularioAPayload({
      ...formularioVacio('b1', 'c1'),
      name: ' Estuche ', sku: ' PA-1 ', description: 'd',
      price: '79900', stock: '10', sizeMl: '', presentation: '',
    })
    expect(p.name).toBe('Estuche')
    expect(p.sku).toBe('PA-1')
    expect(p.price).toBe(79900)
    expect(p.stock).toBe(10)
    expect(p.sizeMl).toBeNull()
    expect(p.presentation).toBeNull()
  })

  it('numera las imágenes por su orden en la lista', () => {
    const p = formularioAPayload({
      ...formularioVacio('b1', 'c1'),
      name: 'x', sku: 'y', description: 'z', price: '1', stock: '0',
      images: [{ url: 'a.png', alt: 'A' }, { url: 'b.png', alt: '' }],
    })
    expect(p.images).toEqual([
      { url: 'a.png', alt: 'A', position: 0 },
      { url: 'b.png', alt: null, position: 1 },
    ])
  })
})

describe('moverImagen', () => {
  const tres = [{ url: 'a' }, { url: 'b' }, { url: 'c' }]

  it('mueve una imagen a otra posición', () => {
    expect(moverImagen(tres, 0, 1).map((i) => i.url)).toEqual(['b', 'a', 'c'])
    expect(moverImagen(tres, 2, 0).map((i) => i.url)).toEqual(['c', 'a', 'b'])
  })

  it('ignora los movimientos fuera de rango', () => {
    expect(moverImagen(tres, 0, -1)).toEqual(tres)
    expect(moverImagen(tres, 2, 3)).toEqual(tres)
  })

  it('no modifica la lista original', () => {
    const copia = [...tres]
    moverImagen(tres, 0, 2)
    expect(tres).toEqual(copia)
  })
})
