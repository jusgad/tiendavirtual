// Lógica pura de la recuperación de contraseña. La pantalla solo pinta.

/**
 * Valida la contraseña nueva antes de mandarla.
 *
 * Las tres reglas son las mismas que aplica el backend (`auth.dto.ts`). Se
 * repiten aquí a propósito: sin esto, la única forma de enterarse de que falta
 * un número es enviar el formulario y leer un error del servidor, y para
 * entonces ya se gastó el token —que sirve una sola vez—.
 */
export function validarContrasena(contrasena, repeticion) {
  const errores = {}

  if (!contrasena) {
    errores.contrasena = 'Escribe una contraseña'
  } else if (contrasena.length < 8) {
    errores.contrasena = 'Debe tener al menos 8 caracteres'
  } else if (!/[A-Za-z]/.test(contrasena)) {
    errores.contrasena = 'Debe incluir al menos una letra'
  } else if (!/\d/.test(contrasena)) {
    errores.contrasena = 'Debe incluir al menos un número'
  }

  if (!errores.contrasena && repeticion !== contrasena) {
    errores.repeticion = 'Las dos contraseñas no coinciden'
  }

  return errores
}

/**
 * ¿El token que viene en el enlace tiene pinta de serlo?
 *
 * Solo descarta lo evidente —vacío o cortado a la mitad al copiar y pegar—
 * para poder decirlo antes de gastar una petición. Que sea válido de verdad
 * solo lo sabe el servidor.
 */
export function tokenPareceValido(token) {
  return typeof token === 'string' && /^[a-f0-9]{20,}$/i.test(token)
}
