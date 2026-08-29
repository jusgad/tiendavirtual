import { formatCOP } from '../api'
import { Card, SecondaryButton } from '../components/ui'

/**
 * `payment` viene del paso anterior: { payment, transaction, orderStatus }.
 * `orderStatus` es el estado REAL leído del backend tras el pago; es `null` si
 * se agotó la espera de la confirmación de Wompi.
 */
export default function ConfirmationStep({ order, payment, contactEmail, onRestart }) {
  const { transaction, orderStatus } = payment
  const pagado = orderStatus && orderStatus !== 'PENDING' && orderStatus !== 'CANCELLED'
  const rechazado = transaction?.status && transaction.status !== 'APPROVED' && !pagado

  return (
    <Card className="mx-auto max-w-lg text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF3DE] text-3xl">
        {pagado ? '✅' : rechazado ? '⚠️' : '⏳'}
      </div>

      <h2 className="font-serif text-2xl text-[#5A2E12]">
        {pagado ? '¡Pago confirmado!' : rechazado ? 'El pago no se completó' : 'Pedido registrado'}
      </h2>
      <p className="mt-1 text-sm text-[#8A6A4A]">
        Número de pedido <strong>{order.orderNumber}</strong>
      </p>

      <div className="my-5 flex flex-wrap items-center justify-center gap-2">
        <StatusBadge label={`Pedido: ${orderStatus ?? order.status}`} tone="orange" />
        {transaction?.status && <StatusBadge label={`Wompi: ${transaction.status}`} tone="violet" />}
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
          {order.discountTotal > 0 && (
            <Row label="Descuento" value={`− ${formatCOP(order.discountTotal)}`} />
          )}
          <Row
            label="Envío"
            value={order.shippingTotal === 0 ? 'Gratis' : formatCOP(order.shippingTotal)}
          />
          <Row label="Total" value={formatCOP(order.total)} bold />
        </div>
      </div>

      {rechazado ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-left text-sm text-red-800">
          <p className="font-bold">El pago fue rechazado o cancelado</p>
          <p className="mt-1">
            Tu pedido sigue reservado. Puedes intentar pagar de nuevo con otro medio; si el
            problema continúa, escríbenos.
          </p>
        </div>
      ) : !pagado ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-800">
          <p className="font-bold">Estamos esperando la confirmación</p>
          <p className="mt-1">
            Wompi todavía no ha confirmado el pago. Algunos medios (como PSE) tardan unos minutos.
            Puedes consultar el estado más tarde con tu número de pedido y tu correo.
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-peach-200 bg-peach-50 p-4 text-left text-sm text-[#6A3A1C]">
          <p className="font-bold text-[#C24E0A]">Ya estamos preparando tu pedido</p>
          <p className="mt-1">
            Te avisaremos cuando salga. Empaque discreto{' '}
            {order.discreetPackaging ? 'activado' : 'no solicitado'}.
          </p>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-[#E7D9C4] p-4 text-left text-sm text-[#6A3A1C]">
        <p className="font-bold">Guarda estos datos para seguir tu pedido</p>
        <p className="mt-1">
          Pedido <strong>{order.orderNumber}</strong>
          {contactEmail && (
            <>
              {' '}
              · correo <strong>{contactEmail}</strong>
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-[#8A6A4A]">
          Con esos dos datos puedes consultar el estado en cualquier momento, sin necesidad de
          cuenta.
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
