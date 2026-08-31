import { useEffect, useState } from 'react'
import { adminApi } from '../api.js'
import { ErrorBanner, Field, Input, PrimaryButton, SecondaryButton } from '../../shared/ui.jsx'
import { Modal } from '../components/ui.jsx'
import {
  formularioAPayload,
  formularioVacio,
  moverImagen,
  productoAFormulario,
  validarProducto,
} from './productsModel.js'

function Selector({ label, value, onChange, opciones, error }) {
  return (
    <Field label={label} error={error}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[#E7D9C4] bg-white px-3.5 py-2.5 text-sm text-[#3A2A1A] focus:border-peach-500 focus:outline-none focus:ring-2 focus:ring-peach-500/25"
      >
        <option value="">Elige una opción…</option>
        {opciones.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </Field>
  )
}

export default function ProductForm({ producto, onCerrar, onGuardado }) {
  const esNuevo = producto === 'nuevo'
  const [form, setForm] = useState(() =>
    esNuevo ? formularioVacio() : productoAFormulario(producto),
  )
  const [marcas, setMarcas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let vigente = true
    Promise.all([adminApi.listBrands(), adminApi.listCategories()])
      .then(([b, c]) => {
        if (!vigente) return
        setMarcas(b.brands)
        setCategorias(c.categories)
        // En un alta, si solo hay una marca y una categoría se preseleccionan:
        // con un catálogo de un producto, elegirlas cada vez es puro estorbo.
        if (esNuevo) {
          setForm((f) => ({
            ...f,
            brandId: f.brandId || (b.brands.length === 1 ? b.brands[0].id : ''),
            categoryId: f.categoryId || (c.categories.length === 1 ? c.categories[0].id : ''),
          }))
        }
      })
      .catch((err) => vigente && setError(err.message))
    return () => {
      vigente = false
    }
  }, [esNuevo])

  const campo = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const cambiarImagen = (i, k, v) =>
    setForm((f) => ({
      ...f,
      images: f.images.map((img, j) => (j === i ? { ...img, [k]: v } : img)),
    }))

  const guardar = async (e) => {
    e.preventDefault()
    const errs = validarProducto(form)
    setErrores(errs)
    if (Object.keys(errs).length > 0) return

    setGuardando(true)
    setError('')
    try {
      const payload = formularioAPayload(form)
      if (esNuevo) await adminApi.createProduct(payload)
      else await adminApi.updateProduct(producto.id, payload)
      onGuardado()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={esNuevo ? 'Nuevo producto' : `Editar ${producto.name}`} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <Field label="Nombre" error={errores.name}>
          <Input value={form.name} onChange={(e) => campo('name')(e.target.value)} />
        </Field>

        <Field label="SKU" error={errores.sku}>
          <Input value={form.sku} onChange={(e) => campo('sku')(e.target.value)} />
        </Field>
        <p className="-mt-2 text-xs text-[#8A6A4A]">
          La dirección web del producto se genera sola a partir del nombre.
        </p>

        <Field label="Descripción" error={errores.description}>
          <textarea
            value={form.description}
            onChange={(e) => campo('description')(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-[#E7D9C4] bg-white px-3.5 py-2.5 text-sm text-[#3A2A1A] focus:border-peach-500 focus:outline-none focus:ring-2 focus:ring-peach-500/25"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Selector label="Marca" value={form.brandId} onChange={campo('brandId')} opciones={marcas} error={errores.brandId} />
          <Selector label="Categoría" value={form.categoryId} onChange={campo('categoryId')} opciones={categorias} error={errores.categoryId} />
          <Field label="Precio (COP)" error={errores.price}>
            <Input inputMode="numeric" value={form.price} onChange={(e) => campo('price')(e.target.value)} />
          </Field>
          <Field label="Stock" error={errores.stock}>
            <Input inputMode="numeric" value={form.stock} onChange={(e) => campo('stock')(e.target.value)} />
          </Field>
          <Field label="Presentación">
            <Input value={form.presentation} onChange={(e) => campo('presentation')(e.target.value)} />
          </Field>
          <Field label="Tamaño (ml)">
            <Input inputMode="numeric" value={form.sizeMl} onChange={(e) => campo('sizeMl')(e.target.value)} />
          </Field>
          <Field label="Tipo de uso">
            <Input value={form.usageType} onChange={(e) => campo('usageType')(e.target.value)} />
          </Field>
          <Field label="Tipo de piel">
            <Input value={form.skinType} onChange={(e) => campo('skinType')(e.target.value)} />
          </Field>
        </div>

        <Field label="Ingredientes">
          <textarea
            value={form.ingredients}
            onChange={(e) => campo('ingredients')(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-[#E7D9C4] bg-white px-3.5 py-2.5 text-sm text-[#3A2A1A] focus:border-peach-500 focus:outline-none focus:ring-2 focus:ring-peach-500/25"
          />
        </Field>

        <Field label="Advertencias">
          <textarea
            value={form.warnings}
            onChange={(e) => campo('warnings')(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-[#E7D9C4] bg-white px-3.5 py-2.5 text-sm text-[#3A2A1A] focus:border-peach-500 focus:outline-none focus:ring-2 focus:ring-peach-500/25"
          />
        </Field>

        {/* ---- Imágenes ---- */}
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#8A6A4A]">Imágenes</p>
          <p className="mb-3 text-xs text-[#8A6A4A]">
            Se guardan por dirección web: sube la foto donde la alojes y pega aquí el enlace.
            La primera es la que se ve en el catálogo.
          </p>

          {errores.images && (
            <p className="mb-2 text-xs font-semibold text-red-600">{errores.images}</p>
          )}

          <div className="space-y-3">
            {form.images.map((img, i) => (
              <div key={i} className="flex gap-3 rounded-xl border border-[#E7D9C4] p-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#FFF3DE]">
                  {img.url?.trim() && (
                    <img src={img.url} alt="" className="h-full w-full object-contain" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <Input
                    value={img.url}
                    onChange={(e) => cambiarImagen(i, 'url', e.target.value)}
                    placeholder="https://…/foto.png"
                  />
                  <Input
                    value={img.alt}
                    onChange={(e) => cambiarImagen(i, 'alt', e.target.value)}
                    placeholder="Descripción de la foto (opcional)"
                  />
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, images: moverImagen(f.images, i, i - 1) }))}
                    disabled={i === 0}
                    className="rounded border border-[#E7D9C4] px-2 text-xs font-bold text-[#6A3A1C] disabled:opacity-30"
                    aria-label="Subir"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, images: moverImagen(f.images, i, i + 1) }))}
                    disabled={i === form.images.length - 1}
                    className="rounded border border-[#E7D9C4] px-2 text-xs font-bold text-[#6A3A1C] disabled:opacity-30"
                    aria-label="Bajar"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, images: f.images.filter((_, j) => j !== i) }))
                    }
                    className="rounded border border-red-200 px-2 text-xs font-bold text-red-700"
                    aria-label="Quitar"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, images: [...f.images, { url: '', alt: '' }] }))}
            className="mt-3 rounded-full border border-[#E7D9C4] px-4 py-2 text-xs font-bold text-[#6A3A1C] hover:bg-[#FFF3DE]"
          >
            Añadir imagen
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-[#3A2A1A]">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => campo('isActive')(e.target.checked)}
          />
          Producto activo (visible en la tienda)
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
