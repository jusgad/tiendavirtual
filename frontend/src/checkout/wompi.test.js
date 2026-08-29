import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Carga el módulo fresco: `loadPromise` es estado de módulo. */
async function loadModule() {
  vi.resetModules()
  return import('./wompi.js')
}

/**
 * Simula el <head> y el constructor del widget. `onAppend` decide qué pasa
 * cuando el script se inserta: cargar bien, fallar, o cargar sin exponer nada.
 */
function stubDom(onAppend) {
  const appended = []
  globalThis.document = {
    createElement: () => ({}),
    head: {
      appendChild: (script) => {
        appended.push(script)
        // El navegador dispara onload/onerror de forma asíncrona.
        queueMicrotask(() => onAppend(script))
      },
    },
  }
  return appended
}

beforeEach(() => {
  globalThis.window = {}
  vi.restoreAllMocks()
})

describe('isPlaceholderKey', () => {
  it('detecta la llave de ejemplo de .env.example', async () => {
    const { isPlaceholderKey } = await loadModule()
    expect(isPlaceholderKey('pub_test_000000000000000000000000')).toBe(true)
    expect(isPlaceholderKey('pub_prod_00000000')).toBe(true)
  })

  it('trata como no configurado un valor vacío', async () => {
    const { isPlaceholderKey } = await loadModule()
    expect(isPlaceholderKey('')).toBe(true)
    expect(isPlaceholderKey(undefined)).toBe(true)
  })

  it('acepta una llave real', async () => {
    const { isPlaceholderKey } = await loadModule()
    expect(isPlaceholderKey('pub_test_aB3xY9kLmN2pQ7rS4tU6')).toBe(false)
    expect(isPlaceholderKey('pub_prod_9zX8wV7uT6sR5qP4oN3m')).toBe(false)
  })
})

describe('loadWompiWidget', () => {
  it('carga el script una sola vez aunque se pida en paralelo', async () => {
    const mod = await loadModule()
    const appended = stubDom((script) => {
      globalThis.window.WidgetCheckout = function () {}
      script.onload()
    })

    const [a, b, c] = await Promise.all([
      mod.loadWompiWidget(),
      mod.loadWompiWidget(),
      mod.loadWompiWidget(),
    ])

    expect(appended).toHaveLength(1)
    expect(a).toBe(b)
    expect(b).toBe(c)
  })

  it('no vuelve a cargar si el widget ya está disponible', async () => {
    const mod = await loadModule()
    globalThis.window.WidgetCheckout = function () {}
    const appended = stubDom(() => {})

    await mod.loadWompiWidget()

    expect(appended).toHaveLength(0)
  })

  it('da un error accionable si el script no carga', async () => {
    const mod = await loadModule()
    stubDom((script) => script.onerror())

    await expect(mod.loadWompiWidget()).rejects.toThrow(/No se pudo cargar el widget/)
  })

  it('permite reintentar tras un fallo de red', async () => {
    const mod = await loadModule()

    let intento = 0
    const appended = stubDom((script) => {
      intento++
      if (intento === 1) return script.onerror()
      globalThis.window.WidgetCheckout = function () {}
      script.onload()
    })

    await expect(mod.loadWompiWidget()).rejects.toThrow()
    await expect(mod.loadWompiWidget()).resolves.toBeTypeOf('function')
    expect(appended).toHaveLength(2)
  })

  it('falla si el script carga pero no expone el widget', async () => {
    const mod = await loadModule()
    stubDom((script) => script.onload())

    await expect(mod.loadWompiWidget()).rejects.toThrow(/no quedó disponible/)
  })
})

describe('openWompiCheckout', () => {
  const checkout = {
    publicKey: 'pub_test_real',
    currency: 'COP',
    amountInCents: 7990000,
    reference: 'PA-2026-ABC',
    signature: 'firma-de-integridad',
    redirectUrl: 'https://pomass.co/track.html',
  }

  function stubWidget(resultado) {
    const construidoCon = []
    globalThis.window.WidgetCheckout = function (config) {
      construidoCon.push(config)
      this.open = (cb) => cb(resultado)
    }
    return construidoCon
  }

  it('pasa la firma de integridad con la forma que espera Wompi', async () => {
    const mod = await loadModule()
    const construidoCon = stubWidget({ transaction: { id: 'txn-1', status: 'APPROVED' } })

    await mod.openWompiCheckout(checkout)

    expect(construidoCon[0]).toMatchObject({
      currency: 'COP',
      amountInCents: 7990000,
      reference: 'PA-2026-ABC',
      publicKey: 'pub_test_real',
      signature: { integrity: 'firma-de-integridad' },
      redirectUrl: 'https://pomass.co/track.html',
    })
  })

  it('omite redirectUrl si el backend no lo definió', async () => {
    const mod = await loadModule()
    const construidoCon = stubWidget({ transaction: { id: 'txn-1' } })

    await mod.openWompiCheckout({ ...checkout, redirectUrl: null })

    expect(construidoCon[0]).not.toHaveProperty('redirectUrl')
  })

  it('devuelve la transacción que informa el widget', async () => {
    const mod = await loadModule()
    stubWidget({ transaction: { id: 'txn-9', status: 'APPROVED' } })

    await expect(mod.openWompiCheckout(checkout)).resolves.toEqual({
      id: 'txn-9',
      status: 'APPROVED',
    })
  })

  it('devuelve null si el cliente cierra sin pagar', async () => {
    const mod = await loadModule()
    stubWidget(undefined)

    await expect(mod.openWompiCheckout(checkout)).resolves.toBeNull()
  })
})
