import { useCallback, useEffect, useRef, useState } from 'react'
import { adminApi } from '../api.js'
import { formatCOP } from '../../shared/format.js'
import { ErrorBanner } from '../../shared/ui.jsx'
import { Badge, Confirmacion, FilaMensaje, Table } from '../components/ui.jsx'

const COLUMNAS = ['Producto', 'SKU', 'Precio', 'Stock', 'Estado', '']

export default function ProductsPage({ onEditar }) {
  const [productos, setProductos] = useState(null)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(null)
  const [aBorrar, setABorrar] = useState(null)
  const [errorBorrado, setErrorBorrado] = useState('')
  // Cada mutación dispara su propia recarga, así que puede haber varias
  // peticiones de `cargar()` en vuelo a la vez. Este contador identifica la
  // más reciente: si una respuesta vieja llega después que una más nueva, se
  // descarta en vez de pisar el estado con datos desactualizados.
  const cargaId = useRef(0)

  const cargar = useCallback(async () => {
    const id = ++cargaId.current
    setError('')
    try {
      const { items } = await adminApi.listProducts({ pageSize: 100 })
      if (id !== cargaId.current) return
      setProductos(items)
    } catch (err) {
      if (id !== cargaId.current) return
      setError(err.message)
      setProductos([])
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Activar y desactivar es la operación del día a día, así que va en la lista
  // y no escondida dentro del formulario.
  const alternarActivo = async (p) => {
    setOcupado(p.id)
    setError('')
    try {
      await adminApi.updateProduct(p.id, { isActive: !p.isActive })
      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setOcupado(null)
    }
  }

  const borrar = async () => {
    setOcupado(aBorrar.id)
    setErrorBorrado('')
    try {
      await adminApi.deleteProduct(aBorrar.id)
      setABorrar(null)
      await cargar()
    } catch (err) {
      // El backend responde 409 si el producto ya tiene pedidos: no se puede
      // borrar sin romper el historial. Se sugiere desactivarlo.
      setErrorBorrado(err.message)
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif text-2xl">Productos</h1>
        <button
          onClick={() => onEditar(null)}
          className="rounded-full bg-gradient-to-r from-peach-500 to-peach-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-peach-500/30"
        >
          Nuevo producto
        </button>
      </div>

      <ErrorBanner message={error} />

      <Table columnas={COLUMNAS}>
        {productos === null && <FilaMensaje columnas={COLUMNAS.length}>Cargando productos…</FilaMensaje>}
        {productos?.length === 0 && !error && (
          <FilaMensaje columnas={COLUMNAS.length}>Todavía no hay productos.</FilaMensaje>
        )}
        {productos?.map((p) => (
          <tr key={p.id} className="border-b border-[#F1E7D8] last:border-0 hover:bg-[#FFF9F0]">
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                {p.images?.[0] && (
                  <img
                    src={p.images[0].url}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-lg bg-[#FFF3DE] object-contain"
                  />
                )}
                <span className="font-bold">{p.name}</span>
              </div>
            </td>
            <td className="px-4 py-3 text-[#6A5A4A]">{p.sku}</td>
            <td className="px-4 py-3 font-semibold">{formatCOP(p.price)}</td>
            <td className="px-4 py-3 text-[#6A5A4A]">{p.stock}</td>
            <td className="px-4 py-3">
              <Badge tono={p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}>
                {p.isActive ? 'Activo' : 'Desactivado'}
              </Badge>
            </td>
            <td className="px-4 py-3">
              <div className="flex justify-end gap-2 whitespace-nowrap">
                <button
                  onClick={() => onEditar(p)}
                  className="rounded-full border border-[#E7D9C4] px-3 py-1.5 text-xs font-bold text-[#6A3A1C] hover:bg-[#FFF3DE]"
                >
                  Editar
                </button>
                <button
                  onClick={() => alternarActivo(p)}
                  disabled={ocupado === p.id}
                  className="rounded-full border border-[#E7D9C4] px-3 py-1.5 text-xs font-bold text-[#6A3A1C] hover:bg-[#FFF3DE] disabled:opacity-40"
                >
                  {p.isActive ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => {
                    setABorrar(p)
                    setErrorBorrado('')
                  }}
                  disabled={ocupado === p.id}
                  className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-40"
                >
                  Borrar
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {aBorrar && (
        <Confirmacion
          titulo={`Borrar ${aBorrar.name}`}
          mensaje="Se borra de forma permanente. Si el producto ya aparece en algún pedido no se podrá borrar: en ese caso desactívalo, así deja de venderse pero el historial se conserva."
          textoConfirmar="Sí, borrar"
          enviando={ocupado === aBorrar.id}
          error={errorBorrado}
          onCerrar={() => setABorrar(null)}
          onConfirmar={borrar}
        />
      )}
    </div>
  )
}
