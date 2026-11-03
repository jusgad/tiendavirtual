import { useState } from 'react'
import { api } from '../api'
import { Card, ErrorBanner, Field, Input, PrimaryButton } from '../components/ui'

const emptyForm = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phone: '',
  ageConfirmed: false,
}

export default function AuthStep({ onAuthenticated }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result =
        mode === 'login'
          ? await api.login({ email: form.email, password: form.password })
          : await api.register(form)
      onAuthenticated(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <div className="mb-6 flex rounded-full bg-[#FFF3DE] p-1">
        {['login', 'register'].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m)
              setError(null)
            }}
            className={
              'flex-1 rounded-full py-2 text-sm font-extrabold transition ' +
              (mode === m ? 'bg-white text-[#C24E0A] shadow' : 'text-[#8A6A4A]')
            }
          >
            {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre">
              <Input required value={form.firstName} onChange={set('firstName')} placeholder="Ana" />
            </Field>
            <Field label="Apellido">
              <Input required value={form.lastName} onChange={set('lastName')} placeholder="Díaz" />
            </Field>
          </div>
        )}

        <Field label="Correo">
          <Input
            type="email"
            required
            value={form.email}
            onChange={set('email')}
            placeholder="ana@correo.com"
          />
        </Field>

        <Field label="Contraseña">
          <Input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={set('password')}
            placeholder="Mínimo 8 caracteres, letras y números"
          />
        </Field>

        {mode === 'register' && (
          <>
            <Field label="Celular (opcional)">
              <Input value={form.phone} onChange={set('phone')} placeholder="3105676187" />
            </Field>

            <label className="flex items-start gap-2 text-sm text-[#6A3A1C]">
              <input
                type="checkbox"
                required
                checked={form.ageConfirmed}
                onChange={set('ageConfirmed')}
                className="mt-0.5 h-4 w-4 rounded border-[#E7D9C4] text-peach-500 focus:ring-peach-500"
              />
              <span>Confirmo que soy mayor de 18 años.</span>
            </label>
          </>
        )}

        <ErrorBanner message={error} />

        <PrimaryButton type="submit" disabled={loading}>
          {loading ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta y continuar'}
        </PrimaryButton>
      </form>

      <p className="mt-4 text-center text-xs text-[#B5AFA0]">
        Tus datos viajan cifrados. No guardamos datos de tu tarjeta.
      </p>
    </Card>
  )
}
