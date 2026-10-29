import PieLegal from '../shared/PieLegal.jsx'
import BotonWhatsApp from './BotonWhatsApp.jsx'
import Combo from './Combo.jsx'
import Crema from './Crema.jsx'
import Faq from './Faq.jsx'
import Hero from './Hero.jsx'
import Marca from './Marca.jsx'
import Problema from './Problema.jsx'
import SiteHeader from './SiteHeader.jsx'
import StickyBuyBar from './StickyBuyBar.jsx'
import Transicion from './Transicion.jsx'
import './landing.css'

/**
 * Landing de PomAss.
 *
 * La página se recorre como se recorre un día, que es el concepto que ya está
 * dentro del sistema de marca: el manual identifica Día con naranja, Noche con
 * magenta-morado, y reserva el degradado que los une para los puntos donde
 * ambos se tocan. Esa es la estructura, y de ahí sale el orden de las bandas.
 *
 * La regla que gobierna todo el archivo: **cada banda hace un trabajo que
 * ninguna otra hace.** La versión anterior repetía el precio cuatro veces, los
 * tubos en tres secciones, los beneficios cinco veces y las promesas de envío
 * nueve veces; cada sección volvía a vender la compra entera en lugar de
 * avanzar un paso. Antes de añadir algo aquí, la pregunta es qué sabe la
 * persona al salir de esa banda que no sabía al entrar.
 *
 *   1. Cabecera          identidad y navegación
 *   2. Apertura          la promesa: «Confianza en todo momento»
 *   3. Problema          nombrar en voz normal lo que no se habla
 *   4. Día               neutraliza olores indeseados
 *   5. Transición        por qué son dos cremas y no una
 *   6. Noche             crema íntima blanqueadora
 *   7. Marca             quién la hace y por qué se puede confiar
 *   8. Combo             el ÚNICO sitio con precio y con compra
 *   9. Preguntas y pie   quitar el último freno; obligaciones legales
 *
 * Sin mascotas, por decisión de la dueña, y sin reseñas: no hay opiniones
 * reales todavía y no se inventan. Cuando las haya, su sitio es entre la
 * banda 7 y la 8.
 */
export default function LandingApp() {
  return (
    <div className="lp min-h-screen bg-brand-crema font-sans text-brand-tinta">
      <a href="#contenido" className="lp-skip">
        Saltar al contenido
      </a>
      <SiteHeader />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <Hero />
        <Problema />
        <Crema modo="dia" />
        <Transicion />
        <Crema modo="noche" invertido />
        <Marca />
        <Combo />
        <Faq />
      </main>
      <PieLegal dejarSitioAbajo />
      <StickyBuyBar />
      {/* Fuera de `main`: es ayuda disponible en toda la página, no una parte
          del recorrido. Va el último para que, en orden de tabulación, llegue
          después del contenido y no antes. */}
      <BotonWhatsApp />
    </div>
  )
}
