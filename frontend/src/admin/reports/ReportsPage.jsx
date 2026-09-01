import { useCallback, useEffect, useRef, useState } from 'react'
import { adminApi } from '../api.js'
import { formatCOP } from '../../shared/format.js'
import { ErrorBanner, Field, Input, SecondaryButton } from '../../shared/ui.jsx'
import { Badge, FilaMensaje, Table } from '../components/ui.jsx'
import { etiquetaEstado, tonoEstado } from '../orders/ordersModel.js'
import Bars, { BarsLeyenda } from './Bars.jsx'
import { aBarras, etiquetaPeriodo, rangoPorDefecto, validarRango } from './reportsModel.js'

const COLUMNAS_VENTAS = ['Periodo', 'Pedidos', 'Ingresos']

// Calma que se espera tras tocar una fecha antes de consultar. `<input
// type="date">` avisa de CADA cambio, y al escribir el año dígito a dígito
// pasa por 0002, 0020, 0202 y 2026: sin esta espera son cuatro consultas —tres
// de ellas de años imposibles— por una sola fecha.
const ESPERA_FECHA_MS = 400

const claseSelect =
  'w-full rounded-xl border border-[#E7D9C4] bg-white px-3.5 py-2.5 text-sm text-[#3A2A1A] ' +
  'focus:border-peach-500 focus:outline-none focus:ring-2 focus:ring-peach-500/25'

function Tarjeta({ titulo, valor }) {
  return (
    <div className="rounded-2xl border border-[#E7D9C4] bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-[#8A6A4A]">{titulo}</p>
      <p className="mt-1 font-serif text-3xl text-[#3A2A1A]">{valor}</p>
    </div>
  )
}

/** Título de sección con su aclaración, para no repetir clases tres veces. */
function TituloSeccion({ children, nota }) {
  return (
    <div className="mb-3">
      <h2 className="font-serif text-lg">{children}</h2>
      {nota && <p className="mt-0.5 text-xs text-[#8A6A4A]">{nota}</p>}
    </div>
  )
}

/**
 * Carga un reporte y deja siempre claro en cuál de los tres estados está:
 * 'cargando', 'listo' (con datos, aunque sean cero filas) o 'error'. Sin esa
 * distinción, un fallo dejaba los datos en `null` para siempre y la pantalla
 * mostraba "Cargando…" eternamente debajo del aviso rojo.
 *
 * La guarda `cargaId` es la misma de Productos y de Categorías y marcas: el id
 * se toma ANTES del `await` y se compara en la rama de éxito y en la de error
 * antes de tocar el estado, así una respuesta vieja que llega tarde se
 * descarta en vez de pisar a la más reciente. Aquí hace más falta que en
 * ninguna otra pantalla: cambiar una fecha o el agrupado dispara una consulta
 * nueva sin esperar a que vuelva la anterior.
 *
 * Cada reporte se pide por su cuenta —y no los tres juntos con `Promise.all`—
 * porque solo el de ventas depende del rango, y porque con `Promise.all` un
 * fallo en cualquiera de los tres borraba los otros dos de la pantalla.
 */
function useReporte(pedir) {
  const [estado, setEstado] = useState({ fase: 'cargando', datos: null, error: '' })
  const cargaId = useRef(0)

  const cargar = useCallback(async () => {
    const id = ++cargaId.current
    // Al recargar se conservan los datos anteriores: la tabla sigue en
    // pantalla en vez de parpadear a "Cargando…" cada vez que se toca un filtro.
    setEstado((actual) => ({ fase: 'cargando', datos: actual.datos, error: '' }))
    try {
      const datos = await pedir()
      if (id !== cargaId.current) return
      setEstado({ fase: 'listo', datos, error: '' })
    } catch (err) {
      if (id !== cargaId.current) return
      // Los datos se sueltan: un aviso de error y unas cifras viejas al lado
      // se leerían como si las cifras fueran las de ahora.
      setEstado({ fase: 'error', datos: null, error: err.message })
    }
  }, [pedir])

  useEffect(() => {
    cargar()
  }, [cargar])

  return [estado, cargar]
}

/** ¿Toca pintar "Cargando…"? Solo la primera vez, cuando aún no hay nada. */
const cargandoPorPrimeraVez = (estado) => estado.fase === 'cargando' && estado.datos === null

export default function ReportsPage() {
  const [rango, setRango] = useState(() => rangoPorDefecto())
  const [groupBy, setGroupBy] = useState('day')
  // El rango que ya se consultó no es el del formulario: se copia cuando la
  // dueña deja de escribir, y solo si tiene sentido.
  const [rangoConsultado, setRangoConsultado] = useState(rango)

  const avisoRango = validarRango(rango)

  useEffect(() => {
    // Un rango imposible no se consulta: se avisa y se deja en pantalla el
    // último reporte bueno, en vez de gastar una petición que se sabe que el
    // backend va a rechazar.
    if (validarRango(rango)) return
    const temporizador = setTimeout(() => setRangoConsultado(rango), ESPERA_FECHA_MS)
    return () => clearTimeout(temporizador)
  }, [rango])

  const pedirVentas = useCallback(
    () => adminApi.salesReport({ ...rangoConsultado, groupBy }),
    [rangoConsultado, groupBy],
  )
  const pedirTop = useCallback(async () => (await adminApi.topProducts(5)).products ?? [], [])
  const pedirEstados = useCallback(async () => (await adminApi.ordersByStatus()).statuses ?? [], [])

  const [ventas, recargarVentas] = useReporte(pedirVentas)
  const [top, recargarTop] = useReporte(pedirTop)
  const [estados, recargarEstados] = useReporte(pedirEstados)

  // Si los tres fallan por lo mismo (la API caída, la sesión vencida) se
  // enseña un solo aviso y no tres iguales.
  const errores = [...new Set([ventas.error, top.error, estados.error].filter(Boolean))]

  const reintentar = () => {
    if (ventas.error) recargarVentas()
    if (top.error) recargarTop()
    if (estados.error) recargarEstados()
  }

  const puntos = ventas.datos ? (ventas.datos.points ?? []) : null
  const barrasTop = aBarras(top.datos ?? [], { etiqueta: 'name', valor: 'revenue' })

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl">Reportes</h1>

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Desde">
          <Input
            type="date"
            value={rango.from}
            onChange={(e) => setRango((r) => ({ ...r, from: e.target.value }))}
          />
        </Field>
        <Field label="Hasta">
          <Input
            type="date"
            value={rango.to}
            onChange={(e) => setRango((r) => ({ ...r, to: e.target.value }))}
          />
        </Field>
        <Field label="Agrupar por">
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className={claseSelect}>
            <option value="day">Día</option>
            <option value="month">Mes</option>
          </select>
        </Field>
      </div>

      {avisoRango ? (
        <p className="text-sm font-semibold text-red-600">{avisoRango}</p>
      ) : (
        (!rango.from || !rango.to) && (
          <p className="text-sm text-[#8A6A4A]">
            La fecha en blanco la completa el sistema: sin “hasta” el reporte llega hasta hoy, y sin
            “desde” arranca 30 días antes.
          </p>
        )
      )}

      {errores.length > 0 && (
        <div className="space-y-2">
          {errores.map((mensaje) => (
            <ErrorBanner key={mensaje} message={mensaje} />
          ))}
          <SecondaryButton type="button" onClick={reintentar}>
            Reintentar
          </SecondaryButton>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Tarjeta titulo="Pedidos en el periodo" valor={ventas.datos?.totalOrders ?? '—'} />
        <Tarjeta
          titulo="Ingresos en el periodo"
          valor={ventas.datos ? formatCOP(ventas.datos.totalRevenue ?? 0) : '—'}
        />
      </div>

      <section className="rounded-2xl border border-[#E7D9C4] bg-white p-5">
        <TituloSeccion>Ventas por periodo</TituloSeccion>
        <Table columnas={COLUMNAS_VENTAS}>
          {cargandoPorPrimeraVez(ventas) && (
            <FilaMensaje columnas={COLUMNAS_VENTAS.length}>Cargando…</FilaMensaje>
          )}
          {puntos?.length === 0 && (
            <FilaMensaje columnas={COLUMNAS_VENTAS.length}>No hubo ventas en este periodo.</FilaMensaje>
          )}
          {puntos?.map((p) => (
            <tr key={p.period} className="border-b border-[#F1E7D8] last:border-0">
              <td className="px-4 py-2.5 font-bold">{etiquetaPeriodo(p.period)}</td>
              <td className="px-4 py-2.5 text-[#6A5A4A]">{p.orders}</td>
              <td className="px-4 py-2.5 font-semibold">{formatCOP(p.revenue)}</td>
            </tr>
          ))}
        </Table>
      </section>

      <section className="rounded-2xl border border-[#E7D9C4] bg-white p-5">
        {/* Ojo: este reporte no acepta fechas, así que no sigue al rango de
            arriba. Se dice para que no se lea como "los más vendidos del mes". */}
        <TituloSeccion nota="De todo el historial, no del rango elegido arriba.">
          Productos más vendidos
        </TituloSeccion>
        {cargandoPorPrimeraVez(top) && <p className="text-sm text-[#8A6A4A]">Cargando…</p>}
        {top.datos?.length === 0 && (
          <p className="text-sm text-[#8A6A4A]">Todavía no se ha vendido ningún producto.</p>
        )}
        {barrasTop.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <BarsLeyenda datos={barrasTop} formatear={formatCOP} />
            {/* En pantalla angosta las dos columnas se apilan y cada barra
                queda lejos de su nombre, que es justo lo que hace inútil un
                gráfico. Ahí se deja solo la lista, que ya dice nombre y cifra. */}
            <div className="hidden sm:block">
              <Bars datos={barrasTop} />
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#E7D9C4] bg-white p-5">
        <TituloSeccion nota="De todo el historial, no del rango elegido arriba.">
          Pedidos por estado
        </TituloSeccion>
        {cargandoPorPrimeraVez(estados) && <p className="text-sm text-[#8A6A4A]">Cargando…</p>}
        {estados.datos?.length === 0 && (
          <p className="text-sm text-[#8A6A4A]">Todavía no hay pedidos.</p>
        )}
        <div className="flex flex-wrap gap-3">
          {estados.datos?.map((e) => (
            <div
              key={e.status}
              className="flex items-center gap-2 rounded-full border border-[#E7D9C4] px-4 py-2"
            >
              <Badge tono={tonoEstado(e.status)}>{etiquetaEstado(e.status)}</Badge>
              <span className="font-extrabold text-[#3A2A1A]">{e.count}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
