import { useRef } from 'react'
import { MotionConfig } from 'framer-motion'
import PieLegal from '../shared/PieLegal.jsx'
import Atmosfera from './Atmosfera.jsx'
import BotonWhatsApp from './BotonWhatsApp.jsx'
import Combo from './Combo.jsx'
import Escenario from './Escenario.jsx'
import Faq from './Faq.jsx'
import Hero from './Hero.jsx'
import Marca from './Marca.jsx'
import Problema from './Problema.jsx'
import Ritual from './Ritual.jsx'
import SiteHeader from './SiteHeader.jsx'
import StickyBuyBar from './StickyBuyBar.jsx'
import { useHistoria } from './useHistoria.js'
import './tokens.css'
import './landing.css'

/**
 * Landing de PomAss.
 *
 * La página se recorre como se recorre un día, que es el concepto que ya está
 * dentro del sistema de marca: el manual identifica Día con naranja, Noche con
 * magenta-morado, y reserva el degradado que los une para los puntos donde
 * ambos se tocan.
 *
 * Desde el rediseño (`PROMPT_REDISENO_POMASS.md`), ese recorrido lo cuentan
 * tres capas a la vez, ligadas al scroll por un mismo valor, `historia`:
 *
 *   - la atmósfera CSS, el degradado de fondo (`Atmosfera`);
 *   - la escena 3D, con el viento y los tubos (`Escenario` → `escena/`);
 *   - el contenido, encima de todo.
 *
 * Una sección por estado, y cada una hace un trabajo que ninguna otra hace:
 *
 *   0 Amanecer    Apertura    la promesa: «Confianza en todo momento»
 *   1 Día         Problema    nombrar en voz normal lo que no se habla
 *   2 Transición  Ritual      por qué son dos cremas, y cada una con su envase
 *   3 Noche       Confianza   quién la hace, y las preguntas que frenan
 *   4 Cierre      Combo       el ÚNICO sitio con precio y con compra
 *
 * Antes eran nueve bandas. Las dos de cada crema y la de la transición se
 * juntaron en el ritual, con una tarjeta por producto generada desde el
 * catálogo: si entra una tercera crema, aparece sola en el ritual, en la
 * escena 3D y en el combo.
 *
 * Sin mascotas redibujadas, por decisión de la dueña: la mascota solo
 * aparece donde ya estaba, en la foto real del envase. Y sin reseñas
 * inventadas: el sitio del testimonio existe y se rellena desde `site.js`.
 */
export default function LandingApp() {
  const raiz = useRef(null)
  const { historia, rafaga } = useHistoria()

  return (
    // `reducedMotion="user"` respeta la preferencia del sistema en todo el
    // árbol de Framer Motion de una vez, sin repetirlo componente a componente.
    <MotionConfig reducedMotion="user">
      {/* Sin fondo propio: detrás están la atmósfera y la escena, y un fondo
          opaco aquí las taparía las dos. */}
      <div ref={raiz} className="pm lp min-h-screen font-sans">
        <a href="#contenido" className="lp-skip">
          Saltar al contenido
        </a>

        <Atmosfera historia={historia} raiz={raiz} />
        <Escenario historia={historia} rafaga={rafaga} raiz={raiz} />

        <div className="pm-contenido">
          <SiteHeader />
          <main id="contenido" tabIndex={-1} className="outline-none">
            <div data-historia="0">
              <Hero />
            </div>
            <div data-historia="1">
              <Problema />
            </div>
            <div data-historia="2">
              <Ritual />
            </div>
            {/* Dos marcas con el mismo valor: entre ellas el recorrido se
                queda en la noche, y el producto no vuelve al frente hasta
                pasar las preguntas (ver `historiaEn`). */}
            <div data-historia="3">
              <Marca />
            </div>
            <div data-historia="3">
              <Faq />
            </div>
            <div data-historia="4">
              <Combo />
            </div>
          </main>
          <PieLegal dejarSitioAbajo />
          <StickyBuyBar />
          {/* Fuera de `main`: es ayuda disponible en toda la página, no una
              parte del recorrido. Va el último para que, en orden de
              tabulación, llegue después del contenido y no antes. */}
          <BotonWhatsApp />
        </div>
      </div>
    </MotionConfig>
  )
}
