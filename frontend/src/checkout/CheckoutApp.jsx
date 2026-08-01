import { useEffect, useState } from 'react'
import {
  api,
  clearGuestId,
  clearSession,
  getAccessToken,
  getGuestId,
  getStoredUser,
  storeSession,
} from './api'
import StepIndicator from './components/StepIndicator'
import AuthStep from './steps/AuthStep'
import ShopStep from './steps/ShopStep'
import CheckoutFormStep from './steps/CheckoutFormStep'
import PaymentStep from './steps/PaymentStep'
import ConfirmationStep from './steps/ConfirmationStep'

const STEPS = ['Cuenta', 'Tienda', 'Envío', 'Pago', 'Confirmación']

export default function CheckoutApp() {
  const [checkingSession, setCheckingSession] = useState(true)
  const [user, setUser] = useState(null)
  const [step, setStep] = useState(0) // índice sobre STEPS
  const [order, setOrder] = useState(null) // pedido creado en el paso "Envío"
  const [payment, setPayment] = useState(null) // { payment, instructions }
  const [cartVersion, setCartVersion] = useState(0) // fuerza recarga del carrito tras fusionar

  // Al cargar, si hay una sesión guardada, valida el access token contra /auth/me.
  useEffect(() => {
    const stored = getStoredUser()
    const token = getAccessToken()
    if (!stored || !token) {
      setCheckingSession(false)
      return
    }
    api
      .me()
      .then(() => {
        setUser(stored)
        setStep(1) // sesión válida -> directo a la tienda
      })
      .catch(() => clearSession())
      .finally(() => setCheckingSession(false))
  }, [])

  const handleAuthenticated = async ({ user: loggedUser, tokens }) => {
    storeSession({ user: loggedUser, tokens })
    setUser(loggedUser)
    // Si ya había carrito de invitado, se fusiona con el del usuario recién logueado.
    const guestId = getGuestId()
    if (guestId) {
      try {
        await api.mergeCart(guestId)
      } finally {
        clearGuestId()
      }
    }
    setCartVersion((v) => v + 1)
    setStep(1)
  }

  const handleSkipAuth = () => setStep(1)

  const handleLogout = () => {
    clearSession()
    setUser(null)
    setOrder(null)
    setPayment(null)
    setStep(0)
  }

  const handleOrderPlaced = (createdOrder) => {
    setOrder(createdOrder)
    setStep(3)
  }

  const handlePaymentInitiated = (result) => {
    setPayment(result)
    setStep(4)
  }

  const restart = () => {
    setOrder(null)
    setPayment(null)
    setStep(1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-50 via-[#FFE3BE] to-peach-400 font-sans">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-black/5 bg-white/70 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="font-serif text-xl text-[#5A2E12]">PomAss</span>
          <span className="rounded-full bg-peach-100 px-2.5 py-0.5 text-[11px] font-bold text-[#7A3A10]">
            demo de checkout
          </span>
        </div>
        {user && (
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-[#6A3A1C] sm:inline">
              Hola, <strong>{user.firstName}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="rounded-full border border-[#C24E0A]/30 px-3 py-1 font-bold text-[#C24E0A] transition hover:bg-[#C24E0A]/10"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <StepIndicator steps={STEPS} current={step} />

        <div className="mt-8">
          {checkingSession ? (
            <div className="py-20 text-center text-[#8A7A65]">Cargando…</div>
          ) : step === 0 ? (
            <AuthStep onAuthenticated={handleAuthenticated} onSkip={handleSkipAuth} />
          ) : step === 1 ? (
            <ShopStep key={cartVersion} onContinue={() => setStep(2)} />
          ) : step === 2 ? (
            <CheckoutFormStep user={user} onBack={() => setStep(1)} onPlaced={handleOrderPlaced} />
          ) : step === 3 && order ? (
            <PaymentStep order={order} onPaid={handlePaymentInitiated} />
          ) : step === 4 && order && payment ? (
            <ConfirmationStep order={order} payment={payment} onRestart={restart} />
          ) : (
            <ShopStep key={cartVersion} onContinue={() => setStep(2)} />
          )}
        </div>
      </main>
    </div>
  )
}
