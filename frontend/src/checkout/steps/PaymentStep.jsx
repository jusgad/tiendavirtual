import { useEffect, useState } from 'react'
import { api, formatCOP } from '../api'
import { estaConfigurado, irAMercadoPago } from '../mercadopago'
import { Card, ErrorBanner, PrimaryButton, SecondaryButton } from '../components/ui'

const MEDIOS = ['💳 Tarjeta', '🏦 PSE', '🏪 Efecty', '💙 Mercado Pago']

/**
 * Último paso dentro de la tienda: de aquí se sale hacia Mercado Pago.
 *
 * No hay nada que sondear después de darle a «Pagar»: la clienta se va del
 * sitio, paga allí y Mercado Pago la devuelve a `track.html`, que es la página
 * que sabe consultar en qué quedó el pedido. La confirmación de verdad no la
 * escribe el navegador sino el webhook.
 */
export default function PaymentStep({ order }) {
  // preparing → ready → leaving | error
  const [phase, setPhase] = useState('preparing')
  const [checkout, setCheckout] = useState(null)
  const [error, setError] = useState(null)

  // Prepara el pago en cuanto se entra al paso: el backend crea (o reutiliza)
  // el registro y el cobro en Mercado Pago, y devuelve a dónde hay que ir.
  useEffect(() => {
    let vivo = true
    api
      .initiatePayment({ orderId: order.id })
      .then((res) => {
        if (!vivo) return
        setCheckout(res.checkout)
        setPhase('ready')
      })
      .catch((err) => {
        if (!vivo) return
        setError(err.message)
        setPhase('error')
      })
    return () => {
      vivo = false
    }
  }, [order.id])

  const pagar = () => {
    setError(null)
    setPhase('leaving')
    try {
      irAMercadoPago(checkout)
    } catch (err) {
      setError(err.message)
      setPhase('ready')
    }
  }

  // ---- Render ----

  if (phase === 'preparing') {
    return (
      <Card className="mx-auto max-w-md text-center">
        <p className="py-10 text-[#8A7A65]">Preparando el pago…</p>
      </Card>
    )
  }

  if (phase === 'error' && !checkout) {
    return (
      <Card className="mx-auto max-w-md">
        <ErrorBanner message={error} />
        <SecondaryButton onClick={() => window.location.reload()} className="mt-4 w-full">
          Reintentar
        </SecondaryButton>
      </Card>
    )
  }

  const sinConfigurar = !estaConfigurado(checkout)

  return (
    <Card className="mx-auto max-w-md">
      <div className="mb-5 rounded-2xl bg-[#FFF3DE] p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-[#8A6A4A]">
          Pedido {order.orderNumber}
        </p>
        <p className="mt-1 font-serif text-2xl text-[#5A2E12]">{formatCOP(order.total)}</p>
        {order.discountTotal > 0 && (
          <p className="text-xs text-[#25D366]">
            Incluye {formatCOP(order.discountTotal)} de descuento
          </p>
        )}
      </div>

      <h2 className="mb-2 font-serif text-xl text-[#5A2E12]">Paga de forma segura</h2>
      <p className="mb-4 text-sm text-[#6A3A1C]">
        Te llevamos a <strong>Mercado Pago</strong>, donde eliges cómo pagar:
      </p>

      <div className="mb-5 grid grid-cols-2 gap-2">
        {MEDIOS.map((m) => (
          <div
            key={m}
            className="rounded-xl border border-[#E7D9C4] px-3 py-2 text-center text-xs font-bold text-[#8A6A4A]"
          >
            {m}
          </div>
        ))}
      </div>

      <ErrorBanner message={error} />

      {sinConfigurar ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-bold">Mercado Pago no está configurado todavía</p>
          <p className="mt-1">
            El backend aún tiene las credenciales de ejemplo. Pon las tuyas del{' '}
            <a
              href="https://www.mercadopago.com.co/developers/panel"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              panel de desarrolladores
            </a>{' '}
            en <code className="rounded bg-amber-100 px-1">backend/.env</code> (
            <code className="rounded bg-amber-100 px-1">MERCADO_PAGO_ACCESS_TOKEN</code> y{' '}
            <code className="rounded bg-amber-100 px-1">MERCADO_PAGO_WEBHOOK_SECRET</code>) y
            reinicia la API.
          </p>
        </div>
      ) : (
        <PrimaryButton onClick={pagar} disabled={phase === 'leaving'}>
          {phase === 'leaving' ? 'Abriendo Mercado Pago…' : `Pagar ${formatCOP(order.total)}`}
        </PrimaryButton>
      )}

      {checkout?.sandbox && !sinConfigurar && (
        <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-center text-xs font-bold text-sky-800">
          Modo de pruebas: no se cobra dinero real.
        </p>
      )}

      <p className="mt-4 text-center text-xs text-[#B5AFA0]">
        🔒 Tus datos de pago se ingresan en Mercado Pago. Esta tienda nunca ve el número de tu
        tarjeta. Al terminar volverás al seguimiento de tu pedido.
      </p>
    </Card>
  )
}
