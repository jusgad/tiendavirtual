import { useState } from 'react'
import { api } from '../../checkout/api.js'
import Logo from '../../shared/Logo.jsx'
import { Card, ErrorBanner, Field, Input, PrimaryButton } from '../../shared/ui.jsx'
import { navigate } from '../router.js'
import { tokenPareceValido, validarContrasena } from './passwordModel.js'

/**
 * Pantalla a la que lleva el enlace del correo de recuperación.
 *
 * El token viaja en la ruta del hash (`#/nueva-contrasena/<token>`), que es
 * donde lo pone `EmailNotifier` en el backend.
 */
export default function ResetPasswordPage({ token }) {
  const [contrasena, setContrasena] = useState('')
  const [repeticion, setRepeticion] = useState('')
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [listo, setListo] = useState(false)

  // Se avisa antes de gastar la petición: el token sirve una sola vez, así que
  // uno cortado al copiar y pegar no debería consumirse contra el servidor.
  if (!tokenPareceValido(token)) {
    return (
      <Marco>
        <h1 className="mb-1 font-serif text-2xl text-[#3A2A1A]">El enlace no sirve</h1>
        <p className="mb-6 text-sm text-[#8A6A4A]">
          Parece que se cortó al copiarlo. Ábrelo directamente desde el correo, o pide uno nuevo
          desde la pantalla de acceso.
        </p>
        <PrimaryButton type="button" onClick={() => navigate('pedidos')}>
          Ir al acceso
        </PrimaryButton>
      </Marco>
    )
  }

  if (listo) {
    return (
      <Marco>
        <h1 className="mb-1 font-serif text-2xl text-[#3A2A1A]">Contraseña actualizada</h1>
        <p className="mb-6 text-sm text-[#8A6A4A]">
          Ya puedes entrar con la nueva. Por seguridad se cerraron las sesiones que estuvieran
          abiertas en otros dispositivos.
        </p>
        <PrimaryButton type="button" onClick={() => navigate('pedidos')}>
          Entrar
        </PrimaryButton>
      </Marco>
    )
  }

  const enviar = async (e) => {
    e.preventDefault()
    const errs = validarContrasena(contrasena, repeticion)
    setErrores(errs)
    if (Object.keys(errs).length > 0) return

    setError('')
    setGuardando(true)
    try {
      await api.resetPassword(token, contrasena)
      setListo(true)
    } catch (err) {
      // Aquí sí se muestra el error del servidor: un token vencido o ya usado
      // hay que poder distinguirlo de una contraseña mal escrita.
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Marco>
      <h1 className="mb-1 font-serif text-2xl text-[#3A2A1A]">Nueva contraseña</h1>
      <p className="mb-6 text-sm text-[#8A6A4A]">
        Al menos 8 caracteres, con una letra y un número.
      </p>

      <form onSubmit={enviar} className="space-y-4">
        <Field label="Contraseña nueva" error={errores.contrasena}>
          <Input
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Repítela" error={errores.repeticion}>
          <Input
            type="password"
            value={repeticion}
            onChange={(e) => setRepeticion(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <ErrorBanner message={error} />
        <PrimaryButton type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar contraseña'}
        </PrimaryButton>
      </form>
    </Marco>
  )
}

function Marco({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFF9F0] px-4">
      <Card className="w-full max-w-sm">
        <Logo alto={34} className="mb-4" />
        {children}
      </Card>
    </div>
  )
}
