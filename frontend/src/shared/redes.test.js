import { describe, expect, it } from 'vitest'
import { REDES, redesActivas } from '../site.js'

/**
 * La regla de las redes: un icono que lleva a un perfil que no existe es
 * peor que no tener el icono. `redesActivas()` es lo que la hace valer, y
 * el componente `Redes.jsx` solo pinta lo que ella devuelve.
 */
describe('redes sociales', () => {
  it('cada red declara id, nombre y url (aunque la url esté vacía)', () => {
    for (const r of REDES) {
      expect(typeof r.id).toBe('string')
      expect(r.id).not.toBe('')
      expect(typeof r.nombre).toBe('string')
      expect(r.nombre).not.toBe('')
      expect(typeof r.url).toBe('string')
    }
  })

  it('no hay ids repetidos: cada uno elige el icono', () => {
    const ids = REDES.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('solo devuelve las redes con url', () => {
    const activas = redesActivas()
    for (const r of activas) expect(r.url.trim()).not.toBe('')
    expect(activas.length).toBe(REDES.filter((r) => r.url.trim() !== '').length)
  })

  it('una url en blanco no cuenta como red activa', () => {
    expect(redesActivas().some((r) => r.url.trim() === '')).toBe(false)
  })

  it('las urls definidas son absolutas y con https: se abren en otra pestaña', () => {
    for (const r of redesActivas()) {
      expect(r.url, r.id).toMatch(/^https:\/\//)
    }
  })
})
