import { formatCOP } from '../api'
import { Card, SecondaryButton } from '../components/ui'

export default function ConfirmationStep({ order, payment, onRestart }) {
  return (
    <Card className="mx-auto max-w-lg text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF3DE] text-3xl">
        🛒
      </div>
      <h2 className="font-serif text-2xl text-[#5A2E12]">¡Pedido creado!</h2>
      <p className="mt-1 text-sm text-[#8A6A4A]">
        Número de pedido <strong>{order.orderNumber}</strong>
      </p>

      <div className="my-5 flex items-center justify-center gap-2">
        <StatusBadge label={`Pedido: ${order.status}`} tone="orange" />
        <StatusBadge label={`Pago: ${payment.payment.status}`} tone="violet" />
      </div>

      <div className="rounded-2xl bg-[#FFF3DE] p-4 text-left">
        <ul className="mb-3 space-y-1.5 text-sm text-[#3A2A1A]">
          {order.items.map((it) => (
            <li key={it.productId} className="flex justify-between">
              <span>
                {it.quantity}× {it.productName}
              </span>
              <span className="font-bold">{formatCOP(it.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-[#E7D9C4] pt-3 text-sm text-[#6A3A1C]">
          <Row label="Subtotal" value={formatCOP(order.subtotal)} />
          {order.discountTotal > 0 && <Row label="Descuento" value={`− ${formatCOP(order.discountTotal)}`} />}
          <Row label="Envío" value={order.shippingTotal === 0 ? 'Gratis' : formatCOP(order.shippingTotal)} />
          <Row label="Total" value={formatCOP(order.total)} bold />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-peach-200 bg-peach-50 p-4 text-left text-sm text-[#6A3A1C]">
        <p className="font-bold text-[#C24E0A]">Instrucciones de pago</p>
        <p className="mt-1">{payment.instructions}</p>
        <p className="mt-2 text-xs text-[#8A6A4A]">
          El pedido pasará a <strong>PAID</strong> automáticamente cuando el proveedor confirme el
          pago por webhook (fuera del alcance de esta demo de interfaz).
        </p>
      </div>

      <SecondaryButton onClick={onRestart} className="mt-6">
        Hacer otro pedido
      </SecondaryButton>
    </Card>
  )
}

function Row({ label, value, bold }) {
  return (
    <div className={'flex justify-between ' + (bold ? 'text-base font-extrabold text-[#5A2E12]' : '')}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function StatusBadge({ label, tone }) {
  const tones = {
    orange: 'bg-peach-100 text-[#B5470C]',
    violet: 'bg-[#EFE6FF] text-[#6A45C8]',
  }
  return (
    <span className={'rounded-full px-3 py-1 text-xs font-extrabold ' + tones[tone]}>{label}</span>
  )
}
