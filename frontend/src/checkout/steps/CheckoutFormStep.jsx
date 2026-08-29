import { useEffect, useState } from 'react'
import { api, formatCOP } from '../api'
import { Card, ErrorBanner, Field, Input, PrimaryButton, SecondaryButton } from '../components/ui'

const emptyAddress = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  department: '',
  postalCode: '',
}

export default function CheckoutFormStep({ user, onBack, onPlaced }) {
  const [cart, setCart] = useState(null)
  const [address, setAddress] = useState(emptyAddress)
  const [guestEmail, setGuestEmail] = useState('')
  const [couponCode, setCouponCode] = useState('')
  const [discreetPackaging, setDiscreetPackaging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getCart().then(({ cart }) => setCart(cart))
  }, [])

  const setField = (key) => (e) => setAddress((a) => ({ ...a, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const correo = user ? user.email : guestEmail.trim()
      const { order } = await api.checkout({
        shippingAddress: {
          ...address,
          line2: address.line2 || null,
          postalCode: address.postalCode || null,
        },
        couponCode: couponCode.trim() || undefined,
        discreetPackaging,
        guestEmail: user ? undefined : correo,
      })
      // El correo se propaga: es lo que permite consultar el seguimiento del
      // pedido después, tanto para invitados como para usuarios con sesión.
      onPlaced(order, correo)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <h2 className="mb-4 font-serif text-2xl text-[#5A2E12]">Dirección de envío</h2>
        <form onSubmit={submit} className="space-y-4">
          {!user && (
            <Field label="Correo de contacto">
              <Input
                type="email"
                required
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="ana@correo.com"
              />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre completo">
              <Input required value={address.fullName} onChange={setField('fullName')} />
            </Field>
            <Field label="Celular">
              <Input required value={address.phone} onChange={setField('phone')} placeholder="3105676187" />
            </Field>
          </div>

          <Field label="Dirección">
            <Input required value={address.line1} onChange={setField('line1')} placeholder="Calle 1 # 2-3" />
          </Field>
          <Field label="Complemento (opcional)">
            <Input value={address.line2} onChange={setField('line2')} placeholder="Apto, torre, referencia" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ciudad">
              <Input required value={address.city} onChange={setField('city')} placeholder="Medellín" />
            </Field>
            <Field label="Departamento">
              <Input required value={address.department} onChange={setField('department')} placeholder="Antioquia" />
            </Field>
          </div>
          <Field label="Código postal (opcional)">
            <Input value={address.postalCode} onChange={setField('postalCode')} />
          </Field>

          <Field label="Cupón de descuento (opcional)">
            <Input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Prueba BIENVENIDA10"
            />
          </Field>

          <label className="flex items-start gap-2 text-sm text-[#6A3A1C]">
            <input
              type="checkbox"
              checked={discreetPackaging}
              onChange={(e) => setDiscreetPackaging(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[#E7D9C4] text-peach-500 focus:ring-peach-500"
            />
            <span>Empaque discreto (sin marca visible en el paquete).</span>
          </label>

          <ErrorBanner message={error} />

          <div className="flex gap-3 pt-2">
            <SecondaryButton type="button" onClick={onBack}>
              ← Volver
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={loading || !cart?.items.length}>
              {loading ? 'Creando pedido…' : 'Confirmar pedido'}
            </PrimaryButton>
          </div>
        </form>
      </Card>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <h3 className="mb-3 font-serif text-xl text-[#5A2E12]">Resumen</h3>
          {!cart ? (
            <p className="text-sm text-[#B5AFA0]">Cargando…</p>
          ) : (
            <>
              <ul className="mb-3 space-y-2">
                {cart.items.map((i) => (
                  <li key={i.productId} className="flex justify-between text-sm text-[#3A2A1A]">
                    <span>
                      {i.quantity}× {i.name}
                    </span>
                    <span className="font-bold">{formatCOP(i.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between border-t border-[#E7D9C4] pt-3 font-extrabold text-[#5A2E12]">
                <span>Subtotal</span>
                <span>{formatCOP(cart.subtotal)}</span>
              </div>
              <p className="mt-2 text-xs text-[#B5AFA0]">
                El descuento y el envío se calculan al confirmar el pedido.
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
