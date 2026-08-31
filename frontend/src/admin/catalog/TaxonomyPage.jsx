import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../api.js'
import { ErrorBanner, Input, PrimaryButton } from '../../shared/ui.jsx'
import { Badge, Confirmacion, FilaMensaje, Table } from '../components/ui.jsx'

const COLUMNAS = ['Nombre', 'Estado', '']

/**
 * Categorías y marcas comparten forma —nombre, descripción, activo— así que
 * comparten componente. `acciones` inyecta las cuatro llamadas del recurso.
 */
function Seccion({ titulo, singular, acciones }) {
  const [items, setItems] = useState(null)
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(null)
  const [aBorrar, setABorrar] = useState(null)
  const [errorBorrado, setErrorBorrado] = useState('')

  const cargar = useCallback(async () => {
    setError('')
    try {
      setItems(await acciones.listar())
    } catch (err) {
      setError(err.message)
      setItems([])
    }
  }, [acciones])

  useEffect(() => {
    cargar()
  }, [cargar])

  const crear = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) return
    setOcupado('nuevo')
    setError('')
    try {
      await acciones.crear({ name: nombre.trim() })
      setNombre('')
      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setOcupado(null)
    }
  }

  const alternar = async (item) => {
    setOcupado(item.id)
    setError('')
    try {
      await acciones.actualizar(item.id, { isActive: !item.isActive })
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
      await acciones.borrar(aBorrar.id)
      setABorrar(null)
      await cargar()
    } catch (err) {
      setErrorBorrado(err.message)
    } finally {
      setOcupado(null)
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-serif text-xl">{titulo}</h2>

      <form onSubmit={crear} className="flex gap-2">
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={`Nombre de la ${singular}`}
        />
        <PrimaryButton type="submit" disabled={ocupado === 'nuevo'} className="w-auto shrink-0 px-5">
          Añadir
        </PrimaryButton>
      </form>

      <ErrorBanner message={error} />

      <Table columnas={COLUMNAS}>
        {items === null && <FilaMensaje columnas={3}>Cargando…</FilaMensaje>}
        {items?.length === 0 && !error && (
          <FilaMensaje columnas={3}>Todavía no hay nada aquí.</FilaMensaje>
        )}
        {items?.map((item) => (
          <tr key={item.id} className="border-b border-[#F1E7D8] last:border-0">
            <td className="px-4 py-3 font-bold">{item.name}</td>
            <td className="px-4 py-3">
              <Badge tono={item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}>
                {item.isActive ? 'Activa' : 'Desactivada'}
              </Badge>
            </td>
            <td className="px-4 py-3">
              <div className="flex justify-end gap-2 whitespace-nowrap">
                <button
                  onClick={() => alternar(item)}
                  disabled={ocupado === item.id}
                  className="rounded-full border border-[#E7D9C4] px-3 py-1.5 text-xs font-bold text-[#6A3A1C] hover:bg-[#FFF3DE] disabled:opacity-40"
                >
                  {item.isActive ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => {
                    setABorrar(item)
                    setErrorBorrado('')
                  }}
                  disabled={ocupado === item.id}
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
          mensaje={`Si algún producto usa esta ${singular} no se podrá borrar. En ese caso desactívala.`}
          textoConfirmar="Sí, borrar"
          enviando={ocupado === aBorrar.id}
          error={errorBorrado}
          onCerrar={() => setABorrar(null)}
          onConfirmar={borrar}
        />
      )}
    </section>
  )
}

const ACCIONES_CATEGORIAS = {
  listar: async () => (await adminApi.listCategories()).categories,
  crear: (datos) => adminApi.createCategory(datos),
  actualizar: (id, datos) => adminApi.updateCategory(id, datos),
  borrar: (id) => adminApi.deleteCategory(id),
}

const ACCIONES_MARCAS = {
  listar: async () => (await adminApi.listBrands()).brands,
  crear: (datos) => adminApi.createBrand(datos),
  actualizar: (id, datos) => adminApi.updateBrand(id, datos),
  borrar: (id) => adminApi.deleteBrand(id),
}

export default function TaxonomyPage() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Seccion titulo="Categorías" singular="categoría" acciones={ACCIONES_CATEGORIAS} />
      <Seccion titulo="Marcas" singular="marca" acciones={ACCIONES_MARCAS} />
    </div>
  )
}
