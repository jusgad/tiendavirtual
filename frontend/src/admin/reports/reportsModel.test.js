import { describe, expect, it } from 'vitest'
import { aBarras, etiquetaPeriodo, limitesConsulta, rangoPorDefecto } from './reportsModel.js'

describe('rangoPorDefecto', () => {
  it('cubre los últimos 30 días, incluido hoy', () => {
    const { from, to } = rangoPorDefecto(new Date('2026-08-30T10:00:00Z'))
    expect(to).toBe('2026-08-30')
    expect(from).toBe('2026-08-01')
  })

  it('a las 9 de la noche en Colombia el día sigue siendo el de hoy, no el de mañana en UTC', () => {
    // 2026-08-31T02:00Z son las 9:00 p. m. del 30 de agosto en Colombia.
    const { from, to } = rangoPorDefecto(new Date('2026-08-31T02:00:00Z'))
    expect(to).toBe('2026-08-30')
    expect(from).toBe('2026-08-01')
  })
})

describe('aBarras', () => {
  it('calcula el porcentaje relativo al mayor', () => {
    const barras = aBarras(
      [
        { name: 'A', revenue: 100 },
        { name: 'B', revenue: 50 },
        { name: 'C', revenue: 0 },
      ],
      { etiqueta: 'name', valor: 'revenue' },
    )
    expect(barras.map((b) => b.porcentaje)).toEqual([100, 50, 0])
    expect(barras[0].etiqueta).toBe('A')
  })

  it('no divide por cero cuando todo vale cero', () => {
    const barras = aBarras([{ name: 'A', revenue: 0 }], { etiqueta: 'name', valor: 'revenue' })
    expect(barras[0].porcentaje).toBe(0)
  })

  it('con la lista vacía devuelve una lista vacía', () => {
    expect(aBarras([], { etiqueta: 'name', valor: 'revenue' })).toEqual([])
  })

  it('trata como cero los valores que no son números', () => {
    const barras = aBarras(
      [
        { name: 'A', revenue: '80' },
        { name: 'B', revenue: null },
      ],
      { etiqueta: 'name', valor: 'revenue' },
    )
    expect(barras.map((b) => b.valor)).toEqual([80, 0])
    expect(barras.map((b) => b.porcentaje)).toEqual([100, 0])
  })
})

describe('etiquetaPeriodo', () => {
  it('formatea el día y el mes en español', () => {
    expect(etiquetaPeriodo('2026-08-30')).toContain('ago')
    expect(etiquetaPeriodo('2026-08')).toContain('ago')
  })

  it('respeta el día que dice el periodo, sin correrlo por el huso horario', () => {
    expect(etiquetaPeriodo('2026-08-30')).toContain('30')
    expect(etiquetaPeriodo('2026-01-01')).toContain('1')
  })
})

describe('limitesConsulta', () => {
  it('abre el primer día y cierra el último, en hora de Colombia', () => {
    expect(limitesConsulta({ from: '2026-08-01', to: '2026-08-30' })).toEqual({
      from: '2026-08-01T00:00:00-05:00',
      to: '2026-08-30T23:59:59.999-05:00',
    })
  })

  it('pedir un solo día da un rango válido, de principio a fin', () => {
    const { from, to } = limitesConsulta({ from: '2026-08-30', to: '2026-08-30' })
    expect(new Date(from).getTime()).toBeLessThan(new Date(to).getTime())
    // Casi 24 horas de diferencia: el día entero, no un instante.
    expect(new Date(to) - new Date(from)).toBeGreaterThan(23 * 60 * 60 * 1000)
  })

  it('omite el extremo que la dueña dejó en blanco', () => {
    expect(limitesConsulta({ from: '2026-08-01', to: '' })).toEqual({
      from: '2026-08-01T00:00:00-05:00',
    })
    expect(limitesConsulta({})).toEqual({})
  })
})
