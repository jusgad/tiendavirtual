import { useEffect, useState } from 'react'
import { api, formatCOP } from '../api'
import { Card, ErrorBanner, PrimaryButton, SecondaryButton } from '../components/ui'

export default function ShopStep({ onContinue }) {
  const [products, setProducts] = useState(null)
  const [cart, setCart] = useState(null)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const loadAll = async () => {
    // Se limpia antes de reintentar: si no, un error viejo seguía visible
    // aunque la recarga hubiera funcionado.
    setError(null)
    try {
      const [productsRes, cartRes] = await Promise.all([
        api.listProducts({ pageSize: 12 }),
        api.getCart(),
      ])
      setProducts(productsRes.items)
      setCart(cartRes.cart)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const addToCart = async (productId) => {
    setBusyId(productId)
    setError(null)
    try {
      const { cart: updated } = await api.addCartItem(productId, 1)
      setCart(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const changeQty = async (productId, quantity) => {
    setBusyId(productId)
    setError(null)
    try {
      const { cart: updated } =
        quantity <= 0 ? await api.removeCartItem(productId) : await api.updateCartItem(productId, quantity)
      setCart(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  if (!products && error) {
    return (
      <div className="py-16 text-center">
        <ErrorBanner message={error} />
        <SecondaryButton onClick={loadAll} className="mt-4">
          Reintentar
        </SecondaryButton>
      </div>
    )
  }

  if (!products) {
    return <div className="py-16 text-center text-[#8A7A65]">Cargando catálogo…</div>
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <h2 className="mb-4 font-serif text-2xl text-[#5A2E12]">Catálogo</h2>
        <ErrorBanner message={error} />
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {products.map((p) => {
            const inCart = cart?.items.find((i) => i.productId === p.id)
            return (
              <Card key={p.id} className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-bold leading-tight text-[#3A2A1A]">{p.name}</h3>
                  <span className="whitespace-nowrap font-serif text-lg text-[#C24E0A]">
                    {formatCOP(p.price)}
                  </span>
                </div>
                <p className="mb-1 text-xs text-[#8A6A4A]">{p.brand?.name} · {p.presentation}</p>
                <p className="mb-3 text-xs text-[#B5AFA0]">Stock: {p.stock}</p>
                {inCart ? (
                  <div className="flex items-center justify-between rounded-full bg-[#FFF3DE] px-2 py-1.5">
                    <button
                      onClick={() => changeQty(p.id, inCart.quantity - 1)}
                      disabled={busyId === p.id}
                      className="h-7 w-7 rounded-full bg-white font-bold text-[#C24E0A] shadow"
                    >
                      −
                    </button>
                    <span className="text-sm font-extrabold text-[#5A2E12]">{inCart.quantity}</span>
                    <button
                      onClick={() => changeQty(p.id, inCart.quantity + 1)}
                      disabled={busyId === p.id || inCart.quantity >= p.stock}
                      className="h-7 w-7 rounded-full bg-white font-bold text-[#C24E0A] shadow disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <SecondaryButton
                    onClick={() => addToCart(p.id)}
                    disabled={busyId === p.id || p.stock === 0}
                    className="w-full"
                  >
                    {p.stock === 0 ? 'Agotado' : 'Agregar al carrito'}
                  </SecondaryButton>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <h3 className="mb-3 font-serif text-xl text-[#5A2E12]">Tu carrito</h3>
          {!cart || cart.items.length === 0 ? (
            <p className="text-sm text-[#B5AFA0]">Aún no has agregado productos.</p>
          ) : (
            <>
              <ul className="mb-4 space-y-2">
                {cart.items.map((i) => (
                  <li key={i.productId} className="flex justify-between text-sm text-[#3A2A1A]">
                    <span>
                      {i.quantity}× {i.name}
                    </span>
                    <span className="font-bold">{formatCOP(i.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="mb-4 flex justify-between border-t border-[#E7D9C4] pt-3 font-extrabold text-[#5A2E12]">
                <span>Subtotal</span>
                <span>{formatCOP(cart.subtotal)}</span>
              </div>
              <PrimaryButton onClick={onContinue}>Continuar al envío →</PrimaryButton>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
