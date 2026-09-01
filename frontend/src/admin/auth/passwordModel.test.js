import { describe, expect, it } from 'vitest'
import { tokenPareceValido, validarContrasena } from './passwordModel.js'

describe('validarContrasena', () => {
  it('acepta una contraseña que cumple las tres reglas', () => {
    expect(validarContrasena('Segura123', 'Segura123')).toEqual({})
  })

  it('exige escribir algo', () => {
    expect(validarContrasena('', '')).toHaveProperty('contrasena')
  })

  it('exige ocho caracteres', () => {
    expect(validarContrasena('Ab1', 'Ab1').contrasena).toContain('8')
  })

  it('exige al menos una letra', () => {
    expect(validarContrasena('12345678', '12345678').contrasena).toContain('letra')
  })

  it('exige al menos un número', () => {
    expect(validarContrasena('abcdefgh', 'abcdefgh').contrasena).toContain('número')
  })

  it('avisa si la repetición no coincide', () => {
    const errores = validarContrasena('Segura123', 'Segura124')
    expect(errores.contrasena).toBeUndefined()
    expect(errores.repeticion).toBeTruthy()
  })

  it('no se queja de la repetición mientras la contraseña siga siendo inválida', () => {
    // Dos errores a la vez confunden: primero se arregla la contraseña.
    const errores = validarContrasena('abc', 'otra cosa')
    expect(errores.contrasena).toBeTruthy()
    expect(errores.repeticion).toBeUndefined()
  })
})

describe('tokenPareceValido', () => {
  it('acepta el token hexadecimal que genera el backend', () => {
    expect(tokenPareceValido('a'.repeat(96))).toBe(true)
  })

  it('rechaza lo que no viene o viene cortado al copiar y pegar', () => {
    expect(tokenPareceValido('')).toBe(false)
    expect(tokenPareceValido(undefined)).toBe(false)
    expect(tokenPareceValido('abc123')).toBe(false)
  })

  it('rechaza lo que no es hexadecimal', () => {
    expect(tokenPareceValido('z'.repeat(40))).toBe(false)
  })
})
