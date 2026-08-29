import { useEffect, useState } from 'react'
import { adminApi } from '../api.js'
import { navigate } from '../router.js'
import { formatCOP, formatFecha } from '../../shared/format.js'
import { ErrorBanner } from '../../shared/ui.jsx'
import { Badge } from '../components/ui.jsx'
import CancelDialog from './CancelDialog.jsx'
import ShipDialog from './ShipDialog.jsx'
import { accionesPara, etiquetaEstado, tonoEstado } from './ordersModel.js'

function Dato({ etiqueta, valor }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-[#8A6A4A]">{etiqueta}</p>
      <p className="text-sm">{valor || '—'}</p>
    </div>
  )
}

function Linea({ etiqueta, valor, fuerte }) {
  return (
    <div className={'flex justify-between py-1 text-sm ' + (fuerte ? 'font-extrabold' : '')}>
      <span className={fuerte ? '' : 'text-[#6A5A4A]'}>{etiqueta}</span>
      <span>{valor}</span>
    </div>
  )
}

export default function OrderDetailPage({ id }) {
  const [order, setOrder] = useState(null)
  const [transiciones, setTransiciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  // Acción con diálogo abierto: 'SHIPPED', 'CANCELLED' o null.
  const [dialogo, setDialogo] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError('')

    adminApi
      .getOrder(id)
      .then((res) => {
        if (!vigente) return
        setOrder(res.order)
        setTransiciones(res.allowedTransitions)
      })
      .catch((err) => vigente && setError(err.message))
      .finally(() => vigente && setCargando(false))

    return () => {
      vigente = false
    }
  }, [id])

  const aplicar = async (status, shipment) => {
    setGuardando(true)
    setErrorAccion('')
    try {
      const res = await adminApi.updateOrderStatus(id, { status, ...shipment })
      setOrder(res.order)
      setTransiciones(res.allowedTransitions)
      setDialogo(null)
    } catch (err) {
      setErrorAccion(err.message)
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <p className="text-sm text-[#8A6A4A]">Cargando pedido…</p>
  if (error) return <ErrorBanner message={error} />
  if (!order) return null

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('pedidos')} className="text-sm font-bold text-[#6A3A1C] hover:underline">
        ← Volver a pedidos
      </button>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-2xl">{order.orderNumber}</h1>
        <Badge tono={tonoEstado(order.status)}>{etiquetaEstado(order.status)}</Badge>
        <span className="text-sm text-[#8A6A4A]">{formatFecha(order.createdAt)}</span>
      </div>

      {order.discreetPackaging && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          📦 Empaque discreto: sin marca visible en el exterior.
        </div>
      )}

      <section className="rounded-2xl border border-[#E7D9C4] bg-white p-5">
        <h2 className="mb-4 font-serif text-lg">Envío</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Dato etiqueta="Destinatario" valor={order.shipFullName} />
          <Dato etiqueta="Teléfono" valor={order.shipPhone} />
          <Dato etiqueta="Dirección" valor={[order.shipLine1, order.shipLine2].filter(Boolean).join(', ')} />
          <Dato etiqueta="Ciudad" valor={[order.shipCity, order.shipDepartment].filter(Boolean).join(', ')} />
          <Dato etiqueta="Código postal" valor={order.shipPostalCode} />
          <Dato etiqueta="Contacto" valor={order.contactEmail} />
          {order.trackingNumber && <Dato etiqueta="Transportadora" valor={order.carrier} />}
          {order.trackingNumber && <Dato etiqueta="Guía" valor={order.trackingNumber} />}
        </div>
      </section>

      <section className="rounded-2xl border border-[#E7D9C4] bg-white p-5">
        <h2 className="mb-4 font-serif text-lg">Artículos</h2>
        <ul className="mb-4 divide-y divide-[#F1E7D8]">
          {order.items.map((it) => (
            <li key={it.productId} className="flex justify-between py-2 text-sm">
              <span>
                {it.productName} <span className="text-[#8A6A4A]">× {it.quantity}</span>
              </span>
              <span className="font-semibold">{formatCOP(it.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-[#E7D9C4] pt-3">
          <Linea etiqueta="Subtotal" valor={formatCOP(order.subtotal)} />
          {order.discountTotal > 0 && (
            <Linea etiqueta="Descuento" valor={`- ${formatCOP(order.discountTotal)}`} />
          )}
          <Linea etiqueta="Envío" valor={order.shippingTotal > 0 ? formatCOP(order.shippingTotal) : 'Gratis'} />
          <Linea etiqueta="Total" valor={formatCOP(order.total)} fuerte />
        </div>
      </section>

      <section className="space-y-3">
        <ErrorBanner message={errorAccion} />
        <div className="flex flex-wrap gap-3">
          {accionesPara(transiciones).map((accion) => (
            <button
              key={accion.status}
              onClick={() =>
                accion.esEnvio || accion.esCancelacion
                  ? setDialogo(accion.status)
                  : aplicar(accion.status)
              }
              disabled={guardando}
              className={
                'rounded-full px-5 py-2.5 text-sm font-extrabold transition disabled:opacity-50 ' +
                (accion.esCancelacion
                  ? 'border border-red-200 text-red-700 hover:bg-red-50'
                  : 'bg-gradient-to-r from-peach-500 to-peach-600 text-white shadow-lg shadow-peach-500/30')
              }
            >
              {accion.label}
            </button>
          ))}
        </div>
        {transiciones.length === 0 && (
          <p className="text-sm text-[#8A6A4A]">
            Este pedido está en un estado final: no admite más cambios.
          </p>
        )}
      </section>

      {dialogo === 'SHIPPED' && (
        <ShipDialog
          enviando={guardando}
          error={errorAccion}
          onCerrar={() => setDialogo(null)}
          onConfirmar={(shipment) => aplicar('SHIPPED', shipment)}
        />
      )}

      {dialogo === 'CANCELLED' && (
        <CancelDialog
          devuelveStock={order.status !== 'SHIPPED'}
          enviando={guardando}
          error={errorAccion}
          onCerrar={() => setDialogo(null)}
          onConfirmar={() => aplicar('CANCELLED')}
        />
      )}
    </div>
  )
}
