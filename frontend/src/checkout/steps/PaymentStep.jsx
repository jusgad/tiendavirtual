import { useEffect, useRef, useState } from 'react'
import { api, formatCOP } from '../api'
import { isPlaceholderKey, openWompiCheckout } from '../wompi'
import { Card, ErrorBanner, PrimaryButton, SecondaryButton } from '../components/ui'

// Cada cuánto y cuántas veces se pregunta al backend si el pago ya se confirmó.
const POLL_INTERVAL_MS = 3000
const POLL_ATTEMPTS = 20 // ~60 s

const MEDIOS = ['💳 Tarjeta', '📲 Nequi', '🏦 PSE', '💜 Bancolombia']

export default function PaymentStep({ order, contactEmail, onPaid }) {
  // preparing → ready → paying → verifying → (onPaid)
  const [phase, setPhase] = useState('preparing')
  const [payment, setPayment] = useState(null)
  const [checkout, setCheckout] = useState(null)
  const [transaction, setTransaction] = useState(null)
  const [error, setError] = useState(null)
  const cancelled = useRef(false)

  useEffect(() => {
    cancelled.current = false
    return () => {
      cancelled.current = true
    }
  }, [])

  // Prepara el pago en cuanto se entra al paso: el backend crea (o reutiliza)
  // el registro y devuelve la configuración firmada del widget.
  useEffect(() => {
    let vivo = true
    api
      .initiatePayment({ orderId: order.id })
      .then((res) => {
        if (!vivo) return
        setPayment(res.payment)
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

  /**
   * Pregunta al backend por el estado real del pedido. El widget informa lo que
   * cree, pero la única fuente de verdad es el webhook de Wompi, que llega al
   * backend por su cuenta. Se consulta el seguimiento público porque funciona
   * igual para invitados que para usuarios con sesión.
   */
  const esperarConfirmacion = async () => {
    for (let intento = 0; intento < POLL_ATTEMPTS; intento++) {
      if (cancelled.current) return null
      try {
        const { order: seguimiento } = await api.trackOrder({
          orderNumber: order.orderNumber,
          email: contactEmail,
        })
        if (seguimiento.status !== 'PENDING') return seguimiento.status
      } catch {
        // Un fallo puntual de consulta no interrumpe la espera.
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    }
    return null // se agotó la espera; el webhook aún no ha llegado
  }

  const pagar = async () => {
    setError(null)
    setPhase('paying')
    try {
      const tx = await openWompiCheckout(checkout)

      if (!tx) {
        // El cliente cerró el widget sin completar el pago.
        setPhase('ready')
        return
      }

      setTransaction(tx)
      setPhase('verifying')

      const estadoFinal = await esperarConfirmacion()
      if (cancelled.current) return

      onPaid({ payment, transaction: tx, orderStatus: estadoFinal })
    } catch (err) {
      if (cancelled.current) return
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

  if (phase === 'verifying') {
    return (
      <Card className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-peach-100 border-t-peach-500" />
        <h2 className="font-serif text-xl text-[#5A2E12]">Verificando tu pago…</h2>
        <p className="mt-2 text-sm text-[#8A6A4A]">
          Estamos esperando la confirmación de Wompi. No cierres esta ventana.
        </p>
        {transaction?.id && (
          <p className="mt-3 text-xs text-[#B5AFA0]">Transacción {transaction.id}</p>
        )}
      </Card>
    )
  }

  const sinConfigurar = isPlaceholderKey(checkout?.publicKey)

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
        Al continuar se abrirá el checkout de <strong>Wompi</strong>, donde eliges cómo pagar:
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
          <p className="font-bold">Wompi no está configurado todavía</p>
          <p className="mt-1">
            El backend está devolviendo la llave pública de ejemplo. Pon tus credenciales de{' '}
            <a
              href="https://comercios.wompi.co"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              comercios.wompi.co
            </a>{' '}
            en <code className="rounded bg-amber-100 px-1">backend/.env</code> (
            <code className="rounded bg-amber-100 px-1">WOMPI_PUBLIC_KEY</code> y{' '}
            <code className="rounded bg-amber-100 px-1">WOMPI_INTEGRITY_SECRET</code>) y reinicia
            la API.
          </p>
        </div>
      ) : (
        <PrimaryButton onClick={pagar} disabled={phase === 'paying'}>
          {phase === 'paying' ? 'Abriendo Wompi…' : `Pagar ${formatCOP(order.total)}`}
        </PrimaryButton>
      )}

      <p className="mt-4 text-center text-xs text-[#B5AFA0]">
        🔒 Tus datos de pago se ingresan dentro de Wompi. Esta tienda nunca ve el número de tu
        tarjeta.
      </p>
    </Card>
  )
}
