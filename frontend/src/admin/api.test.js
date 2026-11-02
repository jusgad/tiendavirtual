import { beforeEach, describe, expect, it, vi } from 'vitest'

// localStorage falso: el cliente HTTP lo usa al importarse y en cada petición.
function stubLocalStorage() {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  }
}

function json(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

async function loadAdminApi() {
  vi.resetModules()
  return import('./api.js')
}

beforeEach(() => {
  stubLocalStorage()
  vi.restoreAllMocks()
})

describe('adminApi.listOrders', () => {
  it('omite el estado cuando no hay filtro', async () => {
    const { adminApi } = await loadAdminApi()
    const fetchMock = vi.fn().mockResolvedValue(json(200, { items: [], total: 0 }))
    globalThis.fetch = fetchMock

    await adminApi.listOrders({ page: 1, pageSize: 20 })

    const url = fetchMock.mock.calls[0][0]
    expect(url).toContain('/admin/orders?')
    expect(url).toContain('page=1')
    expect(url).toContain('pageSize=20')
    expect(url).not.toContain('status=')
  })

  it('incluye el estado cuando se filtra', async () => {
    const { adminApi } = await loadAdminApi()
    globalThis.fetch = vi.fn().mockResolvedValue(json(200, { items: [], total: 0 }))

    await adminApi.listOrders({ status: 'PAID', page: 2, pageSize: 20 })

    expect(globalThis.fetch.mock.calls[0][0]).toContain('status=PAID')
  })
})

describe('adminApi.updateOrderStatus', () => {
  it('envía el estado y los datos de despacho en el cuerpo', async () => {
    const { adminApi } = await loadAdminApi()
    globalThis.fetch = vi.fn().mockResolvedValue(json(200, { order: {}, allowedTransitions: [] }))

    await adminApi.updateOrderStatus('order-1', {
      status: 'SHIPPED',
      carrier: 'Servientrega',
      trackingNumber: 'ABC123',
    })

    const [url, opciones] = globalThis.fetch.mock.calls[0]
    expect(url).toContain('/admin/orders/order-1/status')
    expect(opciones.method).toBe('PATCH')
    expect(JSON.parse(opciones.body)).toEqual({
      status: 'SHIPPED',
      carrier: 'Servientrega',
      trackingNumber: 'ABC123',
    })
  })

  it('no manda campos de despacho cuando no los hay', async () => {
    const { adminApi } = await loadAdminApi()
    globalThis.fetch = vi.fn().mockResolvedValue(json(200, { order: {}, allowedTransitions: [] }))

    await adminApi.updateOrderStatus('order-1', { status: 'PREPARING' })

    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body)).toEqual({ status: 'PREPARING' })
  })
})

describe('adminApi · catálogo', () => {
  it('pide los productos incluyendo los desactivados', async () => {
    const { adminApi } = await loadAdminApi()
    globalThis.fetch = vi.fn().mockResolvedValue(json(200, { items: [], total: 0 }))

    await adminApi.listProducts({ page: 1, pageSize: 50 })

    const url = globalThis.fetch.mock.calls[0][0]
    expect(url).toContain('/products?')
    expect(url).toContain('includeInactive=true')
    expect(url).toContain('pageSize=50')
  })

  it('crea un producto con POST', async () => {
    const { adminApi } = await loadAdminApi()
    globalThis.fetch = vi.fn().mockResolvedValue(json(201, { product: {} }))

    await adminApi.createProduct({ name: 'Nuevo' })

    const [url, opciones] = globalThis.fetch.mock.calls[0]
    expect(url).toContain('/products')
    expect(opciones.method).toBe('POST')
    expect(JSON.parse(opciones.body)).toEqual({ name: 'Nuevo' })
  })

  it('sube una imagen como multipart, no como JSON', async () => {
    const { adminApi } = await loadAdminApi()
    globalThis.fetch = vi.fn().mockResolvedValue(json(201, { url: 'https://cdn.test/foto.jpg' }))
    const archivo = new File(['contenido'], 'foto.jpg', { type: 'image/jpeg' })

    const resultado = await adminApi.uploadProductImage(archivo)

    const [url, opciones] = globalThis.fetch.mock.calls[0]
    expect(url).toContain('/products/images')
    expect(opciones.method).toBe('POST')
    // Nunca Content-Type a mano: lo pone el navegador con el boundary, y si
    // este cliente lo fijara, el backend no sabría separar las partes.
    expect(opciones.headers['Content-Type']).toBeUndefined()
    expect(opciones.body).toBeInstanceOf(FormData)
    expect(opciones.body.get('imagen')).toBe(archivo)
    expect(resultado).toEqual({ url: 'https://cdn.test/foto.jpg' })
  })

  it('si falla la subida, propaga el mensaje de error del backend', async () => {
    const { adminApi } = await loadAdminApi()
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(json(503, { error: { message: 'Subir imágenes no está configurado' } }))
    const archivo = new File(['x'], 'foto.png', { type: 'image/png' })

    await expect(adminApi.uploadProductImage(archivo)).rejects.toThrow(
      'Subir imágenes no está configurado',
    )
  })

  it('lista categorías y marcas incluyendo las inactivas', async () => {
    const { adminApi } = await loadAdminApi()
    globalThis.fetch = vi.fn().mockResolvedValue(json(200, { categories: [] }))
    await adminApi.listCategories()
    expect(globalThis.fetch.mock.calls[0][0]).toContain('/categories?includeInactive=true')

    globalThis.fetch = vi.fn().mockResolvedValue(json(200, { brands: [] }))
    await adminApi.listBrands()
    expect(globalThis.fetch.mock.calls[0][0]).toContain('/brands?includeInactive=true')
  })

  it('borra con DELETE', async () => {
    const { adminApi } = await loadAdminApi()
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => ({}) })

    await adminApi.deleteProduct('p1')

    const [url, opciones] = globalThis.fetch.mock.calls[0]
    expect(url).toContain('/products/p1')
    expect(opciones.method).toBe('DELETE')
  })
})
