import {
  NotConfiguredImageStorage,
  SupabaseImageStorage,
} from '../../../src/modules/catalog/infrastructure/supabaseImageStorage'
import { ServiceUnavailableError } from '../../../src/shared/errors/AppError'

const CONFIG = {
  url: 'https://proyecto.supabase.co',
  serviceRoleKey: 'servicio-secreto',
  bucket: 'product-images',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

describe('SupabaseImageStorage', () => {
  const fetchOriginal = global.fetch

  afterEach(() => {
    global.fetch = fetchOriginal
  })

  it('sube el archivo con un nombre generado y devuelve la URL pública', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true })
    global.fetch = fetchMock as unknown as typeof fetch

    const storage = new SupabaseImageStorage(CONFIG)
    const resultado = await storage.upload({ buffer: Buffer.from('foto'), mimeType: 'image/png' })

    // La URL y el nombre de archivo que trae son el mismo (sin esto, se
    // podría subir a una ruta y devolver la de otra).
    const [url, opciones] = fetchMock.mock.calls[0]
    const nombreSubido = String(url).split('/').pop()
    expect(resultado.url).toBe(
      `https://proyecto.supabase.co/storage/v1/object/public/product-images/${nombreSubido}`,
    )
    expect(nombreSubido).toMatch(new RegExp(`${UUID_RE.source.slice(1, -1)}\\.png$`))

    // La llave de servicio nunca debe faltar en ninguna de las dos cabeceras
    // que Supabase pide (son dos, no una: `Authorization` y `apikey`).
    expect(opciones.headers.Authorization).toBe('Bearer servicio-secreto')
    expect(opciones.headers.apikey).toBe('servicio-secreto')
    expect(opciones.headers['x-upsert']).toBe('false')
    expect(opciones.headers['Content-Type']).toBe('image/png')
  })

  it('usa la extensión correcta para cada tipo permitido', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true })
    global.fetch = fetchMock as unknown as typeof fetch
    const storage = new SupabaseImageStorage(CONFIG)

    await storage.upload({ buffer: Buffer.from('x'), mimeType: 'image/jpeg' })
    await storage.upload({ buffer: Buffer.from('x'), mimeType: 'image/webp' })

    const nombres = fetchMock.mock.calls.map(([url]: [string]) => url.split('/').pop())
    expect(nombres[0]).toMatch(/\.jpg$/)
    expect(nombres[1]).toMatch(/\.webp$/)
  })

  it('lanza ServiceUnavailableError si Supabase responde con error', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 403, text: async () => 'bucket no existe' }) as unknown as typeof fetch

    const storage = new SupabaseImageStorage(CONFIG)

    await expect(storage.upload({ buffer: Buffer.from('x'), mimeType: 'image/png' })).rejects.toThrow(
      ServiceUnavailableError,
    )
  })
})

describe('NotConfiguredImageStorage', () => {
  it('avisa con un error claro en vez de intentar subir nada', async () => {
    const storage = new NotConfiguredImageStorage()

    await expect(storage.upload()).rejects.toThrow(ServiceUnavailableError)
    await expect(storage.upload()).rejects.toThrow(/SUPABASE_URL/)
  })
})
