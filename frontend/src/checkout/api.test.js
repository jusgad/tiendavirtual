import { beforeEach, describe, expect, it, vi } from 'vitest'

const BASE = 'http://localhost:3000/api'

// localStorage falso: el módulo lo usa al importarse y en cada petición.
function stubLocalStorage() {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  }
}

/** Respuesta mínima con la forma que consume el cliente. */
function json(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

/** Carga el módulo fresco: `refreshInFlight` y el handler son estado de módulo. */
async function loadApi() {
  vi.resetModules()
  return import('./api.js')
}

beforeEach(() => {
  stubLocalStorage()
  vi.restoreAllMocks()
})

describe('renovación del access token', () => {
  it('renueva y reintenta una vez cuando el access token venció', async () => {
    const mod = await loadApi()
    mod.storeSession({
      user: { id: 'u1', firstName: 'Ana' },
      tokens: { accessToken: 'viejo', refreshToken: 'refresh-1' },
    })

    const fetchMock = vi
      .fn()
      // 1ª llamada a /auth/me -> token vencido
      .mockResolvedValueOnce(json(401, { error: { message: 'Token expirado' } }))
      // renovación
      .mockResolvedValueOnce(json(200, { tokens: { accessToken: 'nuevo', refreshToken: 'refresh-2' } }))
      // reintento de /auth/me
      .mockResolvedValueOnce(json(200, { user: { id: 'u1' } }))
    globalThis.fetch = fetchMock

    const res = await mod.api.me()

    expect(res.user.id).toBe('u1')
    expect(fetchMock).toHaveBeenCalledTimes(3)

    // El reintento va con el token NUEVO, no con el vencido.
    const reintento = fetchMock.mock.calls[2]
    expect(reintento[1].headers.Authorization).toBe('Bearer nuevo')

    // Y el par rotado quedó guardado.
    expect(mod.getAccessToken()).toBe('nuevo')
    expect(mod.getRefreshToken()).toBe('refresh-2')
  })

  it('deduplica renovaciones concurrentes: el backend rota y rechaza el reuso', async () => {
    const mod = await loadApi()
    mod.storeSession({
      user: { id: 'u1' },
      tokens: { accessToken: 'viejo', refreshToken: 'refresh-1' },
    })

    const fetchMock = vi.fn(async (url) => {
      if (url === `${BASE}/auth/refresh`) {
        return json(200, { tokens: { accessToken: 'nuevo', refreshToken: 'refresh-2' } })
      }
      // Todo lo demás: 401 la primera vez, 200 si ya se renovó.
      return mod.getAccessToken() === 'nuevo' ? json(200, { ok: true }) : json(401, {})
    })
    globalThis.fetch = fetchMock

    // Tres peticiones que caducan a la vez.
    await Promise.all([mod.api.me(), mod.api.getCart(), mod.api.getOrder('x')])

    const renovaciones = fetchMock.mock.calls.filter((c) => c[0] === `${BASE}/auth/refresh`)
    // Si fueran 3, la 2ª y la 3ª reutilizarían un refresh token ya consumido y
    // el backend invalidaría la sesión recién renovada.
    expect(renovaciones).toHaveLength(1)
  })

  it('si la renovación falla, limpia la sesión y avisa a la aplicación', async () => {
    const mod = await loadApi()
    mod.storeSession({
      user: { id: 'u1' },
      tokens: { accessToken: 'viejo', refreshToken: 'caducado' },
    })

    const avisado = vi.fn()
    mod.setOnSessionExpired(avisado)

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(json(401, {}))
      .mockResolvedValueOnce(json(401, { error: { message: 'Refresh token inválido o expirado' } }))

    await expect(mod.api.me()).rejects.toMatchObject({ status: 401 })

    expect(avisado).toHaveBeenCalledTimes(1)
    expect(mod.getAccessToken()).toBeNull()
    expect(mod.getRefreshToken()).toBeNull()
    expect(mod.getStoredUser()).toBeNull()
  })

  it('no reintenta más de una vez: un 401 tras renovar se propaga', async () => {
    const mod = await loadApi()
    mod.storeSession({ user: { id: 'u1' }, tokens: { accessToken: 'a', refreshToken: 'r' } })

    const fetchMock = vi.fn(async (url) =>
      url === `${BASE}/auth/refresh`
        ? json(200, { tokens: { accessToken: 'b', refreshToken: 'r2' } })
        : json(401, {}),
    )
    globalThis.fetch = fetchMock

    await expect(mod.api.me()).rejects.toMatchObject({ status: 401 })

    // petición + renovación + un solo reintento
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('un invitado (sin refresh token) no intenta renovar', async () => {
    const mod = await loadApi()
    mod.setGuestId('invitado-1')

    const fetchMock = vi.fn().mockResolvedValue(json(401, { error: { message: 'No autenticado' } }))
    globalThis.fetch = fetchMock

    await expect(mod.api.me()).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('los endpoints sin auth no disparan renovación', async () => {
    const mod = await loadApi()
    mod.storeSession({ user: { id: 'u1' }, tokens: { accessToken: 'a', refreshToken: 'r' } })

    const fetchMock = vi.fn().mockResolvedValue(json(401, {}))
    globalThis.fetch = fetchMock

    await expect(mod.api.login({ email: 'a@b.co', password: 'x' })).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('identidad de invitado', () => {
  it('guarda el guestId que devuelve el backend y lo reenvía después', async () => {
    const mod = await loadApi()

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(201, { cart: { items: [] }, guestId: 'g-123' }))
      .mockResolvedValueOnce(json(200, { cart: { items: [] } }))
    globalThis.fetch = fetchMock

    await mod.api.addCartItem('prod-1', 1)
    expect(mod.getGuestId()).toBe('g-123')

    await mod.api.getCart()
    expect(fetchMock.mock.calls[1][1].headers['x-guest-id']).toBe('g-123')
  })

  it('con sesión no envía x-guest-id', async () => {
    const mod = await loadApi()
    mod.setGuestId('g-123')
    mod.storeSession({ user: { id: 'u1' }, tokens: { accessToken: 'a', refreshToken: 'r' } })

    const fetchMock = vi.fn().mockResolvedValue(json(200, { cart: { items: [] } }))
    globalThis.fetch = fetchMock

    await mod.api.getCart()

    const headers = fetchMock.mock.calls[0][1].headers
    expect(headers.Authorization).toBe('Bearer a')
    expect(headers['x-guest-id']).toBeUndefined()
  })
})

describe('errores de red', () => {
  it('da un mensaje accionable si el backend no responde', async () => {
    const mod = await loadApi()
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(mod.api.listProducts()).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining('¿Está el backend corriendo?'),
    })
  })
})

describe('seguimiento público', () => {
  it('construye la query con nº de pedido y correo, sin auth', async () => {
    const mod = await loadApi()
    const fetchMock = vi.fn().mockResolvedValue(json(200, { order: { status: 'PAID' } }))
    globalThis.fetch = fetchMock

    await mod.api.trackOrder({ orderNumber: 'PA-2026-ABC', email: 'ana@correo.com' })

    const [url] = fetchMock.mock.calls[0]
    expect(url).toContain('/orders/track?')
    expect(url).toContain('orderNumber=PA-2026-ABC')
    expect(url).toContain('email=ana%40correo.com')
  })
})
