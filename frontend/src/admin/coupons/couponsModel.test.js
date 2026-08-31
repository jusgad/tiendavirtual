import { describe, expect, it } from 'vitest'
import {
  cuponAFormulario,
  descripcionDescuento,
  estadoCupon,
  formularioAPayloadCupon,
  formularioVacioCupon,
  validarCupon,
} from './couponsModel.js'

describe('validarCupon', () => {
  const base = () => ({ ...formularioVacioCupon(), code: 'BIENVENIDA10', value: '10' })

  it('acepta un cupón porcentual válido', () => {
    expect(validarCupon(base())).toEqual({})
  })

  it('exige código de al menos 3 caracteres', () => {
    expect(validarCupon({ ...base(), code: 'AB' }).code).toBeTruthy()
  })

  it('exige un valor mayor que cero', () => {
    expect(validarCupon({ ...base(), value: '0' }).value).toBeTruthy()
    expect(validarCupon({ ...base(), value: '' }).value).toBeTruthy()
  })

  it('no deja pasar un porcentaje mayor que 100', () => {
    expect(validarCupon({ ...base(), type: 'PERCENTAGE', value: '120' }).value).toBeTruthy()
    expect(validarCupon({ ...base(), type: 'FIXED', value: '120000' }).value).toBeUndefined()
  })

  it('exige que la fecha de inicio sea anterior a la de fin', () => {
    const e = validarCupon({ ...base(), startsAt: '2026-12-31', endsAt: '2026-01-01' })
    expect(e.endsAt).toBeTruthy()
  })

  it('exige que el código no pase de 40 caracteres', () => {
    expect(validarCupon({ ...base(), code: 'X'.repeat(41) }).code).toBeTruthy()
    expect(validarCupon({ ...base(), code: 'X'.repeat(40) }).code).toBeUndefined()
  })

  it('no acepta un monto mínimo de compra negativo, pero en blanco es válido', () => {
    expect(validarCupon({ ...base(), minPurchase: '-1' }).minPurchase).toBeTruthy()
    expect(validarCupon({ ...base(), minPurchase: '0' }).minPurchase).toBeUndefined()
    expect(validarCupon({ ...base(), minPurchase: '' }).minPurchase).toBeUndefined()
  })

  it('exige que el máximo de usos sea un entero mayor que cero, si viene', () => {
    expect(validarCupon({ ...base(), maxUses: '5.5' }).maxUses).toBeTruthy()
    expect(validarCupon({ ...base(), maxUses: '0' }).maxUses).toBeTruthy()
    expect(validarCupon({ ...base(), maxUses: '5' }).maxUses).toBeUndefined()
    expect(validarCupon({ ...base(), maxUses: '' }).maxUses).toBeUndefined()
  })

  it('exige que el límite de usos por cliente sea un entero mayor que cero, si viene', () => {
    expect(validarCupon({ ...base(), perUserLimit: '-2' }).perUserLimit).toBeTruthy()
    expect(validarCupon({ ...base(), perUserLimit: '1.5' }).perUserLimit).toBeTruthy()
    expect(validarCupon({ ...base(), perUserLimit: '3' }).perUserLimit).toBeUndefined()
    expect(validarCupon({ ...base(), perUserLimit: '' }).perUserLimit).toBeUndefined()
  })
})

describe('formularioAPayloadCupon', () => {
  it('manda el código solo al crear: un cupón no se puede renombrar', () => {
    const f = { ...formularioVacioCupon(), code: 'nuevo10', value: '10' }
    expect(formularioAPayloadCupon(f, { esNuevo: true }).code).toBe('NUEVO10')
    expect(formularioAPayloadCupon(f, { esNuevo: false }).code).toBeUndefined()
  })

  it('convierte números y omite los opcionales vacíos', () => {
    const p = formularioAPayloadCupon(
      { ...formularioVacioCupon(), code: 'X10', value: '10', minPurchase: '50000', maxUses: '' },
      { esNuevo: true },
    )
    expect(p.value).toBe(10)
    expect(p.minPurchase).toBe(50000)
    expect('maxUses' in p).toBe(false)
  })

  it('al editar, manda null para borrar un opcional que se deja en blanco', () => {
    const f = {
      ...formularioVacioCupon(),
      code: 'X10',
      value: '10',
      minPurchase: '',
      maxUses: '',
      perUserLimit: '',
      startsAt: '',
      endsAt: '',
    }
    const p = formularioAPayloadCupon(f, { esNuevo: false })
    expect(p.minPurchase).toBeNull()
    expect(p.maxUses).toBeNull()
    expect(p.perUserLimit).toBeNull()
    expect(p.startsAt).toBeNull()
    expect(p.endsAt).toBeNull()
  })

  it('al editar, sigue mandando el valor cuando el campo lo trae', () => {
    const f = {
      ...formularioVacioCupon(),
      code: 'X10',
      value: '10',
      minPurchase: '50000',
      maxUses: '5',
      perUserLimit: '1',
      startsAt: '2026-01-01',
      endsAt: '2026-12-31',
    }
    const p = formularioAPayloadCupon(f, { esNuevo: false })
    expect(p.minPurchase).toBe(50000)
    expect(p.maxUses).toBe(5)
    expect(p.perUserLimit).toBe(1)
    expect(p.startsAt).toBe('2026-01-01')
    expect(p.endsAt).toBe('2026-12-31')
  })
})

describe('descripcionDescuento', () => {
  it('describe el descuento en palabras', () => {
    expect(descripcionDescuento({ type: 'PERCENTAGE', value: 10 })).toBe('10 % de descuento')
    expect(descripcionDescuento({ type: 'FIXED', value: 15000 })).toContain('15.000')
  })
})

describe('estadoCupon', () => {
  const ahora = new Date('2026-06-15T12:00:00Z')

  it('marca como desactivado el que no está activo', () => {
    expect(estadoCupon({ isActive: false }, ahora).etiqueta).toBe('Desactivado')
  })

  it('marca el que aún no empieza y el que ya expiró', () => {
    expect(estadoCupon({ isActive: true, startsAt: '2026-07-01' }, ahora).etiqueta).toBe('Programado')
    expect(estadoCupon({ isActive: true, endsAt: '2026-01-01' }, ahora).etiqueta).toBe('Expirado')
  })

  it('marca el que agotó sus usos', () => {
    expect(estadoCupon({ isActive: true, maxUses: 5, usedCount: 5 }, ahora).etiqueta).toBe('Agotado')
  })

  it('el resto está vigente', () => {
    expect(estadoCupon({ isActive: true, maxUses: 5, usedCount: 2 }, ahora).etiqueta).toBe('Vigente')
  })
})
