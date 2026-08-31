import { useEffect, useState } from 'react'
import { clearSession, getStoredUser, setOnSessionExpired } from '../checkout/api.js'
import Logo from '../shared/Logo.jsx'
import ProductForm from './catalog/ProductForm.jsx'
import ProductsPage from './catalog/ProductsPage.jsx'
import LoginGate from './LoginGate.jsx'
import OrderDetailPage from './orders/OrderDetailPage.jsx'
import OrdersPage from './orders/OrdersPage.jsx'
import { navigate, useRoute } from './router.js'

const SECCIONES = [
  { ruta: 'pedidos', etiqueta: 'Pedidos', rutasActivas: ['pedidos', 'pedido'] },
  { ruta: 'productos', etiqueta: 'Productos', rutasActivas: ['productos'] },
  { ruta: 'taxonomia', etiqueta: 'Categorías y marcas', rutasActivas: ['taxonomia'] },
  { ruta: 'cupones', etiqueta: 'Cupones', rutasActivas: ['cupones'] },
  { ruta: 'reportes', etiqueta: 'Reportes', rutasActivas: ['reportes'] },
]

/** Marcador de las secciones que llegan en el siguiente plan (F4–F6). */
function EnConstruccion({ titulo }) {
  return (
    <div className="rounded-2xl border border-[#E7D9C4] bg-white p-8 text-center text-sm text-[#8A6A4A]">
      <p className="font-bold text-[#3A2A1A]">{titulo}</p>
      <p className="mt-1">Esta sección aún no está construida.</p>
    </div>
  )
}

export default function AdminApp() {
  const [user, setUser] = useState(() => getStoredUser())
  const [aviso, setAviso] = useState('')
  // `null` = ninguno; un objeto = editando ese producto; `'nuevo'` = alta.
  const [productoEnEdicion, setProductoEnEdicion] = useState(null)
  const [recargaProductos, setRecargaProductos] = useState(0)
  const route = useRoute()

  useEffect(() => {
    // El cliente HTTP avisa cuando el refresh token también caducó.
    setOnSessionExpired(() => {
      setUser(null)
      setAviso('Tu sesión expiró. Vuelve a ingresar.')
    })
  }, [])

  const salir = () => {
    clearSession()
    setUser(null)
    setAviso('')
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <>
        {aviso && (
          <div className="bg-[#FFF3DE] px-4 py-2 text-center text-sm font-semibold text-[#6A3A1C]">
            {aviso}
          </div>
        )}
        <LoginGate onSesionIniciada={setUser} />
      </>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#FFF9F0] text-[#3A2A1A]">
      <aside className="hidden w-56 shrink-0 border-r border-[#E7D9C4] bg-white/70 p-4 sm:block">
        <Logo alto={30} className="mb-6 px-2" />
        <nav className="space-y-1">
          {SECCIONES.map((s) => (
            <button
              key={s.ruta}
              onClick={() => navigate(s.ruta)}
              className={
                'block w-full rounded-lg px-3 py-2 text-left text-sm font-bold transition ' +
                (s.rutasActivas.includes(route.name)
                  ? 'bg-peach-500 text-white'
                  : 'text-[#6A3A1C] hover:bg-[#FFF3DE]')
              }
            >
              {s.etiqueta}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[#E7D9C4] bg-white/70 px-4 py-3">
          <span className="text-sm font-semibold">{user.email}</span>
          <button onClick={salir} className="text-sm font-bold text-[#6A3A1C] hover:underline">
            Salir
          </button>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          {route.name === 'pedidos' && <OrdersPage />}
          {route.name === 'pedido' && <OrderDetailPage id={route.params.id} />}
          {route.name === 'productos' && (
            <>
              <ProductsPage
                key={recargaProductos}
                onEditar={(p) => setProductoEnEdicion(p ?? 'nuevo')}
              />
              {productoEnEdicion && (
                <ProductForm
                  producto={productoEnEdicion}
                  onCerrar={() => setProductoEnEdicion(null)}
                  onGuardado={() => {
                    setProductoEnEdicion(null)
                    // Cambiar la `key` remonta la lista y la obliga a recargar.
                    setRecargaProductos((n) => n + 1)
                  }}
                />
              )}
            </>
          )}
          {route.name === 'taxonomia' && <EnConstruccion titulo="Categorías y marcas" />}
          {route.name === 'cupones' && <EnConstruccion titulo="Cupones" />}
          {route.name === 'reportes' && <EnConstruccion titulo="Reportes" />}
        </main>
      </div>
    </div>
  )
}
