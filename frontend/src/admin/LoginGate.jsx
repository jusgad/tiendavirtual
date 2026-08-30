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
      </Card>
    </div>
  )
}
