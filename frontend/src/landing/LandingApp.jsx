import { useState } from 'react'
import PieLegal from '../shared/PieLegal.jsx'
import AnnouncementBar from './AnnouncementBar.jsx'
import Combo from './Combo.jsx'
import DayNight from './DayNight.jsx'
import Faq from './Faq.jsx'
import FinalCta from './FinalCta.jsx'
import Hero from './Hero.jsx'
import Marquee from './Marquee.jsx'
import SiteHeader from './SiteHeader.jsx'
import StickyBuyBar from './StickyBuyBar.jsx'
import { usePrefiereMenosMovimiento } from './hooks.js'
import './landing.css'

/**
 * Landing de PomAss, construida sobre el manual de marca:
 *
 * - Base crema y coral institucional. Naranja solo para Día, magenta-morado
 *   solo para Noche, y el degradado que las une reservado a titulares clave y
 *   botones de compra —el manual pide no convertir toda la pieza en degradado—.
 * - La jerarquía del manual: logo → «Confianza en todo momento.» → beneficio
 *   de Día → beneficio de Noche → precio y compra.
 * - Sin mascotas, por decisión de la dueña, y sin reseñas: no hay opiniones
 *   reales todavía y no se inventan. Cuando las haya, su lugar natural es
 *   justo antes del combo.
 */
export default function LandingApp() {
  const [modo, setModo] = useState('dia')
  const reducido = usePrefiereMenosMovimiento()

  // Tocar un tubo del hero lleva a esa crema en el selector.
  const verModo = (id) => {
    setModo(id)
    document
      .getElementById('dia-noche')
      ?.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <div className="lp min-h-screen bg-brand-crema font-sans text-brand-tinta">
      <a href="#contenido" className="lp-skip">
        Saltar al contenido
      </a>
      <AnnouncementBar />
      <SiteHeader />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <Hero onVerModo={verModo} />
        <Marquee />
        <DayNight modo={modo} onModo={setModo} />
        <Combo />
        <Faq />
        <FinalCta />
      </main>
      <PieLegal dejarSitioAbajo />
      <StickyBuyBar />
    </div>
  )
}
