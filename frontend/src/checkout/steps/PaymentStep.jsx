import { useState } from 'react'
import { api, formatCOP } from '../api'
import { Card, ErrorBanner, Field, Input, PrimaryButton } from '../components/ui'

const METHODS = [
  { value: 'NEQUI', label: 'Nequi', icon: '📲' },
  { value: 'DAVIPLATA', label: 'Daviplata', icon: '💜' },
  { value: 'CREDIT_CARD', label: 'Tarjeta de crédito', icon: '💳' },
]

export default function PaymentStep({ order, onPaid }) {
  const [method, setMethod] = useState('NEQUI')
  const [phone, setPhone] = useState('')
  const [card, setCard] = useState({ number: '', expMonth: '', expYear: '', cvv: '', holder: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const setCardField = (key) => (e) => setCard((c) => ({ ...c, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload = { orderId: order.id, method }
      if (method === 'CREDIT_CARD') {
        payload.card = {
          number: card.number.replace(/\s+/g, ''),
          expMonth: Number(card.expMonth),
          expYear: Number(card.expYear),
          cvv: card.cvv,
          holder: card.holder || undefined,
        }
      } else {
        payload.phone = phone
      }
      const result = await api.initiatePayment(payload)
      onPaid(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <div className="mb-5 rounded-2xl bg-[#FFF3DE] p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-[#8A6A4A]">Pedido {order.orderNumber}</p>
        <p className="mt-1 font-serif text-2xl text-[#5A2E12]">{formatCOP(order.total)}</p>
        {order.discountTotal > 0 && (
          <p className="text-xs text-[#25D366]">Incluye {formatCOP(order.discountTotal)} de descuento</p>
        )}
      </div>

      <h2 className="mb-3 font-serif text-xl text-[#5A2E12]">¿Cómo quieres pagar?</h2>

      <div className="mb-5 grid grid-cols-3 gap-2">
        {METHODS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMethod(m.value)}
            className={
              'rounded-xl border p-3 text-center text-xs font-bold transition ' +
              (method === m.value
                ? 'border-peach-500 bg-peach-50 text-[#C24E0A]'
                : 'border-[#E7D9C4] text-[#8A6A4A] hover:bg-[#FFF3DE]')
            }
          >
            <div className="mb-1 text-xl">{m.icon}</div>
            {m.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {method === 'CREDIT_CARD' ? (
          <>
            <Field label="Número de tarjeta">
              <Input
                required
                inputMode="numeric"
                value={card.number}
                onChange={setCardField('number')}
                placeholder="4242 4242 4242 4242"
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Mes">
                <Input required inputMode="numeric" value={card.expMonth} onChange={setCardField('expMonth')} placeholder="12" />
              </Field>
              <Field label="Año">
                <Input required inputMode="numeric" value={card.expYear} onChange={setCardField('expYear')} placeholder="2030" />
              </Field>
              <Field label="CVV">
                <Input required inputMode="numeric" value={card.cvv} onChange={setCardField('cvv')} placeholder="123" />
              </Field>
            </div>
            <Field label="Titular (opcional)">
              <Input value={card.holder} onChange={setCardField('holder')} />
            </Field>
          </>
        ) : (
          <Field label="Número de celular">
            <Input
              required
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="3105676187"
            />
          </Field>
        )}

        <ErrorBanner message={error} />

        <PrimaryButton type="submit" disabled={loading}>
          {loading ? 'Procesando…' : `Pagar ${formatCOP(order.total)}`}
        </PrimaryButton>
      </form>

      <p className="mt-4 text-center text-xs text-[#B5AFA0]">
        Pasarela simulada: valida el formato real (Luhn en tarjeta, celular colombiano) pero no cobra de verdad.
      </p>
    </Card>
  )
}
