import { useState } from 'react'
import { api, storeSession } from '../checkout/api.js'
import Logo from '../shared/Logo.jsx'
import { Card, ErrorBanner, Field, Input, PrimaryButton } from '../shared/ui.jsx'

/**
 * Acceso al panel. Este gate es comodidad, no seguridad: quien protege de
 * verdad es el backend, que exige rol ADMIN en cada endpoint.
 */
export default function LoginGate({ onSesionIniciada }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [enviandoEnlace, setEnviandoEnlace] = useState(false)
  const [avisoEnlace, setAvisoEnlace] = useState('')

  /**
   * Pide el correo de recuperación.
   *
   * El aviso que se muestra es el mismo exista o no la cuenta, igual que la
   * respuesta del servidor: si dijera "ese correo no existe" convertiría esta
   * pantalla en una forma de averiguar qué cuentas hay.
   */
  const pedirEnlace = async () => {
    if (!email.trim()) {
      setError('Escribe tu correo arriba y vuelve a pulsar el enlace.')
      return
    }
    setError('')
    setEnviandoEnlace(true)
    try {
      await api.forgotPassword(email.trim())
    } catch {
      // Se ignora a propósito: un error aquí también delataría, por diferencia
      // de comportamiento, si la cuenta existe.
    } finally {
      setEnviandoEnlace(false)
      setAvisoEnlace(
        'Si ese correo tiene una cuenta, le acabamos de enviar un enlace para cambiar la contraseña. Revisa también la carpeta de spam.',
      )
    }
  }

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const data = await api.login({ email, password })
      if (data.user?.role !== 'ADMIN') {
        setError('Esta cuenta no tiene permisos de administración.')
        return
      }
      storeSession(data)
      onSesionIniciada(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFF9F0] px-4">
      <Card className="w-full max-w-sm">
        <Logo alto={34} className="mb-4" />
        <h1 className="mb-1 font-serif text-2xl text-[#3A2A1A]">Panel de administración</h1>
        <p className="mb-6 text-sm text-[#8A6A4A]">Ingresa con tu cuenta de administración.</p>

        <form onSubmit={enviar} className="space-y-4">
          <Field label="Correo">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Contraseña">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <ErrorBanner message={error} />
          <PrimaryButton type="submit" disabled={cargando}>
            {cargando ? 'Entrando…' : 'Entrar'}
          </PrimaryButton>
        </form>

        {avisoEnlace ? (
          <p className="mt-4 rounded-xl bg-[#FFF3DE] px-3 py-2.5 text-sm text-[#6A3A1C]">
            {avisoEnlace}
          </p>
        ) : (
          <button
            type="button"
            onClick={pedirEnlace}
            disabled={enviandoEnlace}
            className="mt-4 text-sm font-bold text-[#6A3A1C] hover:underline disabled:opacity-50"
          >
            {enviandoEnlace ? 'Enviando…' : 'Olvidé mi contraseña'}
          </button>
        )}
      </Card>
    </div>
  )
}
