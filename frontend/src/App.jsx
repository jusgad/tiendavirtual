import { useEffect, useRef, useState } from 'react'
import Background from './components/Background'
import SunMoon from './components/SunMoon'
import Header from './components/Header'
import Hero from './components/Hero'
import OfferCard from './components/OfferCard'
import StickyBar from './components/StickyBar'
import Toast from './components/Toast'

export default function App() {
  const [mode, setMode] = useState('day') // 'day' | 'night'
  const [toast, setToast] = useState(false)
  const rootRef = useRef(null)
  const toastTimer = useRef(null)

  const isDay = mode === 'day'
  const toggle = () => setMode((m) => (m === 'day' ? 'night' : 'day'))

  // Muestra el toast de "agregado" y lleva al checkout real (página aparte).
  const buy = () => {
    setToast(true)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => {
      window.location.href = '/checkout.html'
    }, 900)
  }

  // Auto-cycles day/night every 7s, like the source design's showcase effect.
  useEffect(() => {
    const id = setInterval(() => {
      setMode((m) => (m === 'day' ? 'night' : 'day'))
    }, 7000)
    return () => clearInterval(id)
  }, [])

  // Swipe left -> night, swipe right -> day (touch devices).
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    let x0 = null
    const onStart = (e) => {
      x0 = e.touches[0].clientX
    }
    const onEnd = (e) => {
      if (x0 == null) return
      const dx = e.changedTouches[0].clientX - x0
      if (Math.abs(dx) > 55) setMode(dx < 0 ? 'night' : 'day')
      x0 = null
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchend', onEnd)
    }
  }, [])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  // Fotos del producto, servidas como estáticos desde public/images.
  // Se usan las versiones ligeras: los PNG originales pesaban varios MB cada
  // uno, y esta es la primera pantalla que carga quien llega.
  const products = {
    tubeDay: '/images/tubo_dia.jpeg',
    tubeNight: '/images/tubo_noche.png',
  }

  return (
    <div ref={rootRef} style={{ position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
      <Background isDay={isDay} />
      <SunMoon isDay={isDay} onToggle={toggle} />
      <Header isDay={isDay} onToggle={toggle} />
      <Hero isDay={isDay} products={products} onBuy={buy} />
      <OfferCard isDay={isDay} onBuy={buy} />
      <StickyBar isDay={isDay} onBuy={buy} />
      <Toast show={toast} />
    </div>
  )
}
