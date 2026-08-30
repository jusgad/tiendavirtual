import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../checkout/api.js'
import { formatCOP, formatFecha } from '../shared/format.js'
import Logo from '../shared/Logo.jsx'
import { Card, ErrorBanner, Field, Input, PrimaryButton, SecondaryButton } from '../shared/ui.jsx'
import { leerPedidoRecordado, recordarPedido } from '../shared/seguimiento.js'
import { esCancelado, esperaConfirmacion, pasosConEstado } from './trackModel.js'

// Espera de la confirmación del webhook al volver de pagar: hasta ~1 minuto.
// El widget informa el pago, pero la verdad la escribe el webhook de Wompi, y
// puede tardar unos segundos en llegar.
const SONDEO_MS = 3000
const SONDEOS_MAX = 20

function Paso({ paso, ultimo }) {
  const completado = paso.estado === 'completado'
  const actual = paso.estado === 'actual'

  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ' +
            (completado
              ? 'bg-emerald-500 text-white'
              : actual
                ? 'bg-peach-500 text-white ring-4 ring-peach-500/20'
                : 'bg-[#EFE3D2] text-[#B5AFA0]')
          }
        >
          {completado ? '✓' : actual ? '●' : ''}
        </span>
        {!ultimo && (
          <span className={'my-1 w-0.5 flex-1 ' + (completado ? 'bg-emerald-500' : 'bg-[#EFE3D2]')} />
        )}
      </div>

      <div className={'pb-5 ' + (actual ? '' : 'opacity-60')}>
        <p className={'text-sm ' + (actual ? 'font-extrabold text-[#3A2A1A]' : 'font-bold text-[#6A5A4A]')}>
          {paso.label}
        </p>
        {actual && <p className="mt-0.5 text-sm text-[#8A6A4A]">{paso.descripcion}</p>}
      </div>
    </li>
  )
}

function Fila({ label, valor, fuerte }) {
  return (
    <div className={'flex justify-between py-0.5 text-sm ' + (fuerte ? 'font-extrabold' : '')}>
      <span className={fuerte ? '' : 'text-[#6A5A4A]'}>{label}</span>
      <span>{valor}</span>
    </div>
  )
}

export default function TrackApp() {
  const recordado = leerPedidoRecordado()

  const [orderNumber, setOrderNumber] = useState(recordado?.orderNumber ?? '')
  const [email, setEmail] = useState(recordado?.email ?? '')
  const [order, setOrder] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [esperando, setEsperando] = useState(false)

  // Se cancela el sondeo si el componente se desmonta o se consulta otra cosa.
  const sondeoRef = useRef(null)
  const detenerSondeo = () => {
    if (sondeoRef.current) {
      clearTimeout(sondeoRef.current)
      sondeoRef.current = null
    }
  }

  const consultar = useCallback(
    async (numero, correo, { intento = 0 } = {}) => {
      const num = numero.trim()
      const cor = correo.trim()
      if (!num || !cor) return

      if (intento === 0) {
        setCargando(true)
        setError('')
      }

      try {
        const { order: pedido } = await api.trackOrder({ orderNumber: num, email: cor })
        setOrder(pedido)
        recordarPedido(num, cor)

        // Mientras el pago no se confirme, se vuelve a preguntar en unos
        // segundos: es el webhook el que mueve el pedido, no esta página.
        if (esperaConfirmacion(pedido.status) && intento < SONDEOS_MAX) {
          setEsperando(true)
          sondeoRef.current = setTimeout(
            () => consultar(num, cor, { intento: intento + 1 }),
            SONDEO_MS,
          )
        } else {
          setEsperando(false)
        }
      } catch (err) {
        setEsperando(false)
        // El backend responde 404 tanto si el pedido no existe como si el
        // correo no coincide, a propósito: no confirma que un número exista.
        if (err instanceof ApiError && err.status === 404) {
          setError('No encontramos ese pedido. Revisa el número y el correo con el que compraste.')
        } else if (err instanceof ApiError && err.status === 429) {
          setError('Hiciste demasiadas consultas seguidas. Espera un momento y vuelve a intentar.')
        } else {
          setError(err.message)
        }
      } finally {
        if (intento === 0) setCargando(false)
      }
    },
    [],
  )

  // Al volver de pagar, Wompi agrega `?id=` a la URL. Si además recordamos el
  // pedido, se consulta solo: quien acaba de pagar no debería teclear nada.
  useEffect(() => {
    const vieneDePagar = new URLSearchParams(window.location.search).has('id')
    if (vieneDePagar && recordado) {
      consultar(recordado.orderNumber, recordado.email)
    }
    return detenerSondeo
    // Solo al montar: `recordado` se lee una vez de localStorage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const enviar = (e) => {
    e.preventDefault()
    detenerSondeo()
    setOrder(null)
    consultar(orderNumber, email)
  }

  const otroPedido = () => {
    detenerSondeo()
    setOrder(null)
    setError('')
    setEsperando(false)
  }

  const cancelado = order && esCancelado(order.status)

  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-50 via-[#FFE3BE] to-peach-400 font-sans">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-black/5 bg-white/70 px-5 py-3 backdrop-blur">
        <Logo alto={34} />
        <span className="rounded-full bg-peach-100 px-2.5 py-0.5 text-[11px] font-bold text-[#7A3A10]">
          seguimiento
        </span>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8">
        {!order ? (
          <Card>
            <h1 className="font-serif text-2xl text-[#5A2E12]">Sigue tu pedido</h1>
            <p className="mt-1 mb-5 text-sm text-[#8A6A4A]">
              Escribe el número de pedido y el correo con el que compraste.
            </p>

            <form onSubmit={enviar} className="space-y-4">
              <Field label="Número de pedido">
                <Input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="PA-2026-000123"
                  required
                />
              </Field>
              <Field label="Correo">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  required
                />
              </Field>

              <ErrorBanner message={error} />

              <PrimaryButton type="submit" disabled={cargando}>
                {cargando ? 'Consultando…' : 'Consultar'}
              </PrimaryButton>
            </form>
          </Card>
        ) : (
          <Card>
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <h1 className="font-serif text-2xl text-[#5A2E12]">{order.orderNumber}</h1>
              <span className="text-sm text-[#8A6A4A]">{formatFecha(order.createdAt)}</span>
            </div>

            {cancelado ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-bold">Este pedido fue cancelado</p>
                <p className="mt-1">
                  Si no pediste la cancelación o crees que es un error, escríbenos y lo revisamos.
                </p>
              </div>
            ) : (
              <ol className="mb-2">
                {pasosConEstado(order.status).map((paso, i, todos) => (
                  <Paso key={paso.status} paso={paso} ultimo={i === todos.length - 1} />
                ))}
              </ol>
            )}

            {esperando && (
              <p className="mb-4 rounded-xl bg-[#FFF3DE] px-4 py-3 text-sm font-semibold text-[#6A3A1C]">
                ⏳ Estamos confirmando tu pago con la pasarela. Esta página se actualiza sola.
              </p>
            )}

            {order.trackingNumber && (
              <div className="mb-4 rounded-2xl border border-[#E7D9C4] bg-[#FFF9F0] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[#8A6A4A]">Envío</p>
                <p className="mt-1 text-sm">
                  {order.carrier} · guía <strong>{order.trackingNumber}</strong>
                </p>
              </div>
            )}

            <div className="rounded-2xl bg-[#FFF3DE] p-4">
              <ul className="mb-3 space-y-1.5 text-sm text-[#3A2A1A]">
                {order.items.map((it, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>
                      {it.quantity}× {it.productName}
                    </span>
                    <span className="font-bold">{formatCOP(it.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-[#E7D9C4] pt-2">
                <Fila label="Total" valor={formatCOP(order.total)} fuerte />
                {order.shipCity && <Fila label="Envío a" valor={order.shipCity} />}
              </div>
            </div>

            <div className="mt-5 flex justify-center">
              <SecondaryButton type="button" onClick={otroPedido}>
                Consultar otro pedido
              </SecondaryButton>
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}
