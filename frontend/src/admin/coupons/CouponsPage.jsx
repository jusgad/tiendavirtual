import { useCallback, useEffect, useRef, useState } from 'react'
import { adminApi } from '../api.js'
import { ErrorBanner, Field, Input, PrimaryButton, SecondaryButton } from '../../shared/ui.jsx'
import { Badge, FilaMensaje, Modal, Table } from '../components/ui.jsx'
import {
  cuponAFormulario,
  descripcionDescuento,
  estadoCupon,
  formularioAPayloadCupon,
  formularioVacioCupon,
  validarCupon,
} from './couponsModel.js'

const COLUMNAS = ['Código', 'Descuento', 'Usos', 'Vigencia', 'Estado', '']

const fechaCorta = (v) => (v ? String(v).slice(0, 10) : '—')

function Formulario({ cupon, onCerrar, onGuardado }) {
  const esNuevo = cupon === 'nuevo'
  const [form, setForm] = useState(() => (esNuevo ? formularioVacioCupon() : cuponAFormulario(cupon)))
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const campo = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const guardar = async (e) => {
    e.preventDefault()
    const errs = validarCupon(form)
    setErrores(errs)
    if (Object.keys(errs).length > 0) return

    setGuardando(true)
    setError('')
    try {
      const payload = formularioAPayloadCupon(form, { esNuevo })
      if (esNuevo) await adminApi.createCoupon(payload)
      else await adminApi.updateCoupon(cupon.id, payload)
      onGuardado()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={esNuevo ? 'Nuevo cupón' : `Editar ${cupon.code}`} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <Field label="Código" error={errores.code}>
          <Input
            value={form.code}
            onChange={(e) => campo('code')(e.target.value)}
            disabled={!esNuevo}
            placeholder="BIENVENIDA10"
          />
        </Field>
        {!esNuevo && (
          <p className="-mt-2 text-xs text-[#8A6A4A]">
            El código no se puede cambiar: quien ya lo tenga dejaría de poder usarlo.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo">
            <select
              value={form.type}
              onChange={(e) => campo('type')(e.target.value)}
              className="w-full rounded-xl border border-[#E7D9C4] bg-white px-3.5 py-2.5 text-sm text-[#3A2A1A] focus:border-peach-500 focus:outline-none focus:ring-2 focus:ring-peach-500/25"
            >
              <option value="PERCENTAGE">Porcentaje</option>
              <option value="FIXED">Monto fijo</option>
            </select>
          </Field>
          <Field label={form.type === 'PERCENTAGE' ? 'Porcentaje' : 'Monto (COP)'} error={errores.value}>
            <Input inputMode="numeric" value={form.value} onChange={(e) => campo('value')(e.target.value)} />
          </Field>
          <Field label="Compra mínima (COP)">
            <Input inputMode="numeric" value={form.minPurchase} onChange={(e) => campo('minPurchase')(e.target.value)} />
          </Field>
          <Field label="Máximo de usos">
            <Input inputMode="numeric" value={form.maxUses} onChange={(e) => campo('maxUses')(e.target.value)} />
          </Field>
          <Field label="Desde">
            <Input type="date" value={form.startsAt} onChange={(e) => campo('startsAt')(e.target.value)} />
          </Field>
          <Field label="Hasta" error={errores.endsAt}>
            <Input type="date" value={form.endsAt} onChange={(e) => campo('endsAt')(e.target.value)} />
          </Field>
        </div>

        <Field label="Límite por usuario">
          <Input inputMode="numeric" value={form.perUserLimit} onChange={(e) => campo('perUserLimit')(e.target.value)} />
        </Field>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <strong>Ojo con el límite por usuario:</strong> solo se puede hacer valer con clientes
          registrados. En las compras como invitado —que son la mayoría— no hay identidad que
          contar, así que ahí no limita nada. Para acotar una promoción de verdad, usa el
          <strong> máximo de usos</strong>.
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-[#3A2A1A]">
          <input type="checkbox" checked={form.isActive} onChange={(e) => campo('isActive')(e.target.checked)} />
          Cupón activo
        </label>

        <ErrorBanner message={error} />

        <div className="flex items-center gap-3 pt-1">
          <SecondaryButton type="button" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}

export default function CouponsPage() {
  const [cupones, setCupones] = useState(null)
  const [error, setError] = useState('')
  const [enEdicion, setEnEdicion] = useState(null)
  // Cada mutación dispara su propia recarga, así que puede haber varias
  // peticiones de `cargar()` en vuelo a la vez. Este contador identifica la
  // más reciente: si una respuesta vieja llega después que una más nueva, se
  // descarta en vez de pisar el estado con datos desactualizados.
  const cargaId = useRef(0)

  const cargar = useCallback(async () => {
    const id = ++cargaId.current
    setError('')
    try {
      const { coupons } = await adminApi.listCoupons()
      if (id !== cargaId.current) return
      setCupones(coupons)
    } catch (err) {
      if (id !== cargaId.current) return
      setError(err.message)
      setCupones([])
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif text-2xl">Cupones</h1>
        <button
          onClick={() => setEnEdicion('nuevo')}
          className="rounded-full bg-gradient-to-r from-peach-500 to-peach-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-peach-500/30"
        >
          Nuevo cupón
        </button>
      </div>

      <ErrorBanner message={error} />

      <Table columnas={COLUMNAS}>
        {cupones === null && <FilaMensaje columnas={COLUMNAS.length}>Cargando cupones…</FilaMensaje>}
        {cupones?.length === 0 && !error && (
          <FilaMensaje columnas={COLUMNAS.length}>Todavía no has creado ningún cupón.</FilaMensaje>
        )}
        {cupones?.map((c) => {
          const estado = estadoCupon(c)
          return (
            <tr key={c.id} className="border-b border-[#F1E7D8] last:border-0 hover:bg-[#FFF9F0]">
              <td className="px-4 py-3 font-bold">{c.code}</td>
              <td className="px-4 py-3 text-[#6A5A4A]">{descripcionDescuento(c)}</td>
              <td className="px-4 py-3 text-[#6A5A4A]">
                {c.usedCount ?? 0}
                {c.maxUses != null ? ` / ${c.maxUses}` : ''}
              </td>
              <td className="px-4 py-3 text-[#6A5A4A]">
                {fechaCorta(c.startsAt)} → {fechaCorta(c.endsAt)}
              </td>
              <td className="px-4 py-3">
                <Badge tono={estado.tono}>{estado.etiqueta}</Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => setEnEdicion(c)}
                  className="rounded-full border border-[#E7D9C4] px-3 py-1.5 text-xs font-bold text-[#6A3A1C] hover:bg-[#FFF3DE]"
                >
                  Editar
                </button>
              </td>
            </tr>
          )
        })}
      </Table>

      {enEdicion && (
        <Formulario
          cupon={enEdicion}
          onCerrar={() => setEnEdicion(null)}
          onGuardado={() => {
            setEnEdicion(null)
            cargar()
          }}
        />
      )}
    </div>
  )
}
