import { useEffect, useState } from 'react'
import { adminApi } from '../api.js'
import { navigate } from '../router.js'
import { formatCOP, formatFecha } from '../../shared/format.js'
import { ErrorBanner } from '../../shared/ui.jsx'
import { Badge, FilaMensaje, Table } from '../components/ui.jsx'
import { ESTADOS, etiquetaEstado, tonoEstado, totalPaginas } from './ordersModel.js'

const PAGE_SIZE = 20
const COLUMNAS = ['Pedido', 'Fecha', 'Contacto', 'Ciudad', 'Total', 'Estado']

export default function OrdersPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [datos, setDatos] = useState({ items: [], total: 0 })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError('')

    adminApi
      .listOrders({ status, page, pageSize: PAGE_SIZE })
      .then((res) => vigente && setDatos(res))
      .catch((err) => vigente && setError(err.message))
      .finally(() => vigente && setCargando(false))

    // Evita que una respuesta lenta de un filtro anterior pise a la actual.
    return () => {
      vigente = false
    }
  }, [status, page])

  const paginas = totalPaginas(datos.total, PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {ESTADOS.map((e) => (
          <button
            key={e.value || 'todos'}
            onClick={() => {
              setStatus(e.value)
              setPage(1)
            }}
            className={
              'rounded-full px-3.5 py-1.5 text-xs font-bold transition ' +
              (status === e.value
                ? 'bg-peach-500 text-white'
                : 'border border-[#E7D9C4] text-[#6A3A1C] hover:bg-[#FFF3DE]')
            }
          >
            {e.label}
          </button>
        ))}
      </div>

      <ErrorBanner message={error} />

      <Table columnas={COLUMNAS}>
        {cargando && <FilaMensaje columnas={COLUMNAS.length}>Cargando pedidos…</FilaMensaje>}
        {!cargando && datos.items.length === 0 && (
          <FilaMensaje columnas={COLUMNAS.length}>No hay pedidos con este filtro.</FilaMensaje>
        )}
        {!cargando &&
          datos.items.map((o) => (
            <tr
              key={o.id}
              onClick={() => navigate(`pedidos/${o.id}`)}
              className="cursor-pointer border-b border-[#F1E7D8] last:border-0 hover:bg-[#FFF9F0]"
            >
              <td className="px-4 py-3 font-bold">{o.orderNumber}</td>
              <td className="px-4 py-3 text-[#6A5A4A]">{formatFecha(o.createdAt)}</td>
              <td className="px-4 py-3 text-[#6A5A4A]">{o.contactEmail ?? '—'}</td>
              <td className="px-4 py-3 text-[#6A5A4A]">{o.shipCity ?? '—'}</td>
              <td className="px-4 py-3 font-semibold">{formatCOP(o.total)}</td>
              <td className="px-4 py-3">
                <Badge tono={tonoEstado(o.status)}>{etiquetaEstado(o.status)}</Badge>
              </td>
            </tr>
          ))}
      </Table>

      <div className="flex items-center justify-between text-sm">
        <span className="text-[#8A6A4A]">
          {datos.total} pedido{datos.total === 1 ? '' : 's'} · página {page} de {paginas}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-full border border-[#E7D9C4] px-4 py-1.5 font-bold text-[#6A3A1C] disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            onClick={() => setPage((p) => Math.min(paginas, p + 1))}
            disabled={page >= paginas}
            className="rounded-full border border-[#E7D9C4] px-4 py-1.5 font-bold text-[#6A3A1C] disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}
